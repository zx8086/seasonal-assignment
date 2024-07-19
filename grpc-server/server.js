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

// Mock data for seasonal assignments
const seasonalData = {
  SEASONAL_ASSIGNMENT_C51_THEU: {
    createdOn: "2024-02-29 14:47:13.469",
    modifiedOn: "2024-02-29 14:47:13.469",
    channels: ["SEASONAL_ASSIGNMENT_C51_THEU"],
    brandCode: "THEU",
    brandName: "Tommy Hilfiger",
    brand: "TH",
    styleSeasonCode: "C51",
    fms: {
      fmsCollection: {
        code: "SP",
        name: "Spring",
      },
      fmsSeason: {
        code: "SPSU",
        name: "Spring /Summer",
        year: "2025",
      },
    },
    divisions: [
      {
        name: "TH Menswear",
        code: 1,
        isActive: true,
        salesOrganizationCode: {
          THE1: true,
          INLC: true,
        },
      },
      {
        name: "Tommy Jeans",
        code: 3,
        isActive: true,
        salesOrganizationCode: {
          THE1: true,
          INLC: true,
        },
      },
    ],
  },
};

function getSeasonalAssignment(call, callback) {
  const { season, brandCode } = call.request;
  const key = `SEASONAL_ASSIGNMENT_${season}_${brandCode}`;
  const assignment = seasonalData[key];

  if (assignment) {
    callback(null, assignment);
  } else {
    callback({
      code: grpc.status.NOT_FOUND,
      details: "Seasonal assignment not found",
    });
  }
}

function main() {
  const server = new grpc.Server();
  server.addService(seasonalAssignments.SeasonalAssignments.service, {
    getSeasonalAssignment,
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
}

main();
