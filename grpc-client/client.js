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

  client.getSeasonalAssignment(
    { season: "C51", brandCode: "THEU" },
    (err, response) => {
      if (err) {
        console.error("Error:", err);
        return;
      }
      console.log("Seasonal Assignment:", JSON.stringify(response, null, 2));
    },
  );
}

main();
