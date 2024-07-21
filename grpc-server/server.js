// server.js

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

function logGrpcCall(method, request, code, details = "") {
  console.log(`[${new Date().toISOString()}] ${method} called`);
  console.log(`Request: ${JSON.stringify(request)}`);
  console.log(`Response: ${code}${details ? " - " + details : ""}`);
  console.log("---");
}

function loggingInterceptor(call, methodDefinition, callback) {
  const oldCallback = callback;
  callback = function (err, res) {
    if (err) {
      logGrpcCall(methodDefinition.path, call.request, "ERROR", err.details);
    } else {
      logGrpcCall(methodDefinition.path, call.request, "SUCCESS");
    }
    oldCallback(err, res);
  };
  return null;
}

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

class SeasonalAssignmentsService {
  constructor(collection) {
    this.collection = collection;
  }

  async getAllSeasonalAssignments(call, callback) {
    console.log("getAllSeasonalAssignments called with:", call.request);
    const { styleSeasonCode, companyCode, isActive } = call.request;

    try {
      if (!styleSeasonCode) {
        throw new Error("styleSeasonCode is required");
      }

      let query;
      let parameters;

      if (companyCode) {
        // Both styleSeasonCode and companyCode provided
        const key = `SEASONAL_ASSIGNMENT_${styleSeasonCode}_${companyCode}`;
        query = `
          SELECT RAW seasonalAssignment
          FROM \`default\`.\`new_model\`.\`seasonal_assignment\` AS seasonalAssignment
          USE KEYS $1
        `;
        parameters = [key];
      } else {
        // Only styleSeasonCode provided
        query = `
          SELECT RAW seasonalAssignment
          FROM \`default\`.\`new_model\`.\`seasonal_assignment\` AS seasonalAssignment
          WHERE META(seasonalAssignment).id LIKE $1
        `;
        parameters = [`SEASONAL_ASSIGNMENT_${styleSeasonCode}%`];
      }

      const result = await this.collection.scope.query(query, { parameters });

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
      console.log("getAllSeasonalAssignments completed successfully");
    } catch (error) {
      console.error("Error in getAllSeasonalAssignments:", error);
      callback({
        code: grpc.status.INTERNAL,
        details: "Error retrieving assignments from database: " + error.message,
      });
    }
  }

  async getSeasonalAssignment(call, callback) {
    console.log("getSeasonalAssignment called with:", call.request);
    const { styleSeasonCode, companyCode, isActive } = call.request;
    const key = `SEASONAL_ASSIGNMENT_${styleSeasonCode}_${companyCode}`;

    try {
      const result = await this.collection.get(key);
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
      console.log("getSeasonalAssignment completed successfully");
    } catch (error) {
      console.error("Error in getSeasonalAssignment:", error);
      if (error instanceof couchbase.DocumentNotFoundError) {
        callback({
          code: grpc.status.NOT_FOUND,
          details: "Seasonal assignment not found",
        });
      } else {
        callback({
          code: grpc.status.INTERNAL,
          details: "Error retrieving assignment from database",
        });
      }
    }
  }

  async getDivisionAssignment(call, callback) {
    console.log("getDivisionAssignment called with:", call.request);
    const { styleSeasonCode, companyCode, divisionCode } = call.request;
    const key = `SEASONAL_ASSIGNMENT_${styleSeasonCode}_${companyCode}`;

    try {
      const result = await this.collection.get(key);
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
        console.log("getDivisionAssignment completed successfully");
      } else {
        console.log("getDivisionAssignment: Division not found");
        callback({
          code: grpc.status.NOT_FOUND,
          details: "Division not found",
        });
      }
    } catch (error) {
      console.error("Error in getDivisionAssignment:", error);
      if (error instanceof couchbase.DocumentNotFoundError) {
        callback({
          code: grpc.status.NOT_FOUND,
          details: "Seasonal assignment not found",
        });
      } else {
        callback({
          code: grpc.status.INTERNAL,
          details: "Error retrieving assignment from database",
        });
      }
    }
  }
}

async function main() {
  try {
    const { cluster, collection } = await initCouchbase();
    console.log("Connected to Couchbase");

    const server = new grpc.Server();
    const service = new SeasonalAssignmentsService(collection);
    server.addService(
      seasonalAssignments.SeasonalAssignments.service,
      {
        getAllSeasonalAssignments:
          service.getAllSeasonalAssignments.bind(service),
        getSeasonalAssignment: service.getSeasonalAssignment.bind(service),
        getDivisionAssignment: service.getDivisionAssignment.bind(service),
      },
      loggingInterceptor,
    );

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
