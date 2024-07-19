import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const PROTO_PATH = path.resolve("../proto/seasonal_assignments.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const seasonalAssignments = protoDescriptor.seasonalassignments;

function main() {
  const client = new seasonalAssignments.SeasonalAssignments(
    "localhost:50051",
    grpc.credentials.createInsecure(),
  );

  // Get all seasonal assignments
  client.getAllSeasonalAssignments({}, (err, response) => {
    if (err) {
      console.error("Error:", err);
      return;
    }
    console.log("All Seasonal Assignments:", JSON.stringify(response, null, 2));
  });

  // Get seasonal assignment for a specific company and season
  client.getSeasonalAssignment(
    { styleSeasonCode: "C51", companyCode: "CKEU" },
    (err, response) => {
      if (err) {
        console.error("Error:", err);
        return;
      }
      console.log(
        "Seasonal Assignment for CKEU C51:",
        JSON.stringify(response, null, 2),
      );
    },
  );

  // Get division assignment for a specific company, season, and division
  client.getDivisionAssignment(
    { styleSeasonCode: "C51", companyCode: "CKEU", divisionCode: "61" },
    (err, response) => {
      if (err) {
        console.error("Error:", err);
        return;
      }
      console.log(
        "Division Assignment for CKEU C51 Division 61:",
        JSON.stringify(response, null, 2),
      );
    },
  );
}

main();
