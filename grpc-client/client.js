//client.js

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

function makeGrpcCall(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
}

async function main() {
  const client = new seasonalAssignments.SeasonalAssignments(
    "localhost:50051",
    grpc.credentials.createInsecure(),
  );

  try {
    // Get all seasonal assignments for a specific season
    const allAssignments = await makeGrpcCall(
      client,
      "getAllSeasonalAssignments",
      { styleSeasonCode: "C51" },
    );
    console.log(
      "All Seasonal Assignments for C51 (Active + Inactive):",
      JSON.stringify(allAssignments, null, 2),
    );

    // Get all seasonal assignments for a specific season (active only)
    const activeAssignments = await makeGrpcCall(
      client,
      "getAllSeasonalAssignments",
      { styleSeasonCode: "C51", isActive: true },
    );
    console.log(
      "All Active Seasonal Assignments for C51 (Active):",
      JSON.stringify(activeAssignments, null, 2),
    );

    // Get seasonal assignment for a specific company and season (active only)
    const activeCompanyAssignment = await makeGrpcCall(
      client,
      "getAllSeasonalAssignments",
      { styleSeasonCode: "C51", companyCode: "THEU", isActive: true },
    );
    console.log(
      "Active Seasonal Assignment for THEU C51 (Active):",
      JSON.stringify(activeCompanyAssignment, null, 2),
    );

    // Get seasonal assignment for a specific company and season (active)
    const seasonalAssignmentActive = await makeGrpcCall(
      client,
      "getSeasonalAssignment",
      { styleSeasonCode: "C51", companyCode: "THEU", isActive: true },
    );
    console.log(
      "Seasonal Assignment for THEU C51 (Active):",
      JSON.stringify(seasonalAssignmentActive, null, 2),
    );

    // Get seasonal assignment for a specific company and season (inactive)
    const seasonalAssignmentInactive = await makeGrpcCall(
      client,
      "getSeasonalAssignment",
      { styleSeasonCode: "C51", companyCode: "THEU", isActive: false },
    );
    console.log(
      "Seasonal Assignment for THEU C51 (Inactive):",
      JSON.stringify(seasonalAssignmentInactive, null, 2),
    );

    // Get division assignment for a specific company, season, and division
    const divisionAssignment = await makeGrpcCall(
      client,
      "getDivisionAssignment",
      { styleSeasonCode: "C51", companyCode: "CKEU", divisionCode: "61" },
    );
    console.log(
      "Division Assignment for CKEU C51 Division 61 (Active or Inactive):",
      JSON.stringify(divisionAssignment, null, 2),
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.close();
  }
}

main().catch(console.error);
