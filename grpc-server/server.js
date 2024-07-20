require("dotenv").config();
const couchbase = require("couchbase");
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = path.resolve(
  __dirname,
  "../proto/seasonal_assignments.proto",
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const seasonalAssignments = protoDescriptor.seasonalassignments;

async function initCouchbase() {
  const cluster = await couchbase.connect(process.env.COUCHBASE_URL, {
    username: process.env.COUCHBASE_USERNAME,
    password: process.env.COUCHBASE_PASSWORD,
  });
  const bucket = cluster.bucket(process.env.COUCHBASE_BUCKET);
  const scope = bucket.scope(process.env.COUCHBASE_SCOPE);
  const collection = scope.collection(process.env.COUCHBASE_COLLECTION);
  return { cluster, collection };
}

async function getAllSeasonalAssignments(call, callback, collection) {
  const { isActive } = call.request;

  try {
    const query = `
      SELECT RAW seasonalAssignment
      FROM \`default\`.\`new_model\`.\`seasonal_assignment\` AS seasonalAssignment
      WHERE META(seasonalAssignment).id LIKE 'SEASONAL_ASSIGNMENT_%'
    `;
    const result = await collection.scope.query(query);

    let assignments = result.rows;

    if (isActive !== undefined) {
      assignments = assignments.map((assignment) => ({
        ...assignment,
        divisions: assignment.divisions.filter(
          (div) => div.isActive === isActive,
        ),
      }));
    }

    callback(null, { assignments });
  } catch (error) {
    console.error("Error retrieving assignments:", error);
    callback({
      code: grpc.status.INTERNAL,
      details: "Error retrieving assignments from database",
    });
  }
}

async function getSeasonalAssignment(call, callback, collection) {
  const { styleSeasonCode, companyCode, isActive } = call.request;
  const key = `SEASONAL_ASSIGNMENT_${styleSeasonCode}_${companyCode}`;

  try {
    const result = await collection.get(key);
    let assignment = result.content;

    if (isActive !== undefined) {
      assignment = {
        ...assignment,
        divisions: assignment.divisions.filter(
          (div) => div.isActive === isActive,
        ),
      };
    }
    callback(null, assignment);
  } catch (error) {
    if (error instanceof couchbase.DocumentNotFoundError) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: "Seasonal assignment not found",
      });
    } else {
      console.error("Error retrieving assignment:", error);
      callback({
        code: grpc.status.INTERNAL,
        details: "Error retrieving assignment from database",
      });
    }
  }
}

async function getDivisionAssignment(call, callback, collection) {
  const { styleSeasonCode, companyCode, divisionCode } = call.request;
  const key = `SEASONAL_ASSIGNMENT_${styleSeasonCode}_${companyCode}`;

  try {
    const result = await collection.get(key);
    const assignment = result.content;

    const division = assignment.divisions.find(
      (div) => div.code === divisionCode,
    );
    if (division) {
      const response = {
        ...assignment,
        divisions: undefined,
        division: division,
      };
      callback(null, response);
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: "Division not found",
      });
    }
  } catch (error) {
    if (error instanceof couchbase.DocumentNotFoundError) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: "Seasonal assignment not found",
      });
    } else {
      console.error("Error retrieving assignment:", error);
      callback({
        code: grpc.status.INTERNAL,
        details: "Error retrieving assignment from database",
      });
    }
  }
}

async function main() {
  try {
    const { cluster, collection } = await initCouchbase();
    console.log("Connected to Couchbase");

    const server = new grpc.Server();
    server.addService(seasonalAssignments.SeasonalAssignments.service, {
      getAllSeasonalAssignments: (call, callback) =>
        getAllSeasonalAssignments(call, callback, collection),
      getSeasonalAssignment: (call, callback) =>
        getSeasonalAssignment(call, callback, collection),
      getDivisionAssignment: (call, callback) =>
        getDivisionAssignment(call, callback, collection),
    });

    server.bindAsync(
      "0.0.0.0:50051",
      grpc.ServerCredentials.createInsecure(),
      (err, port) => {
        if (err) {
          console.error("Failed to bind server:", err);
          return;
        }
        console.log(`Server running at http://0.0.0.0:${port}`);
        server.start();
      },
    );
  } catch (error) {
    console.error("Failed to initialize Couchbase:", error);
  }
}

main();
