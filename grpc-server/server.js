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
    companyCode: "THEU",
    name: "Tommy Hilfiger",
    brand: "TH",
    brandName: "Tommy Hilfiger",
    styleSeasonCode: "C51",
    channels: ["SEASONAL_ASSIGNMENT_C51_THEU"],
    divisions: [
      { name: "TH Menswear", code: "01", isActive: true },
      { name: "Tommy Jeans", code: "02", isActive: true },
      { name: "TH Licensees", code: "03", isActive: true },
      { name: "TH Kids", code: "04", isActive: true },
      { name: "TH Womenswear", code: "05", isActive: true },
      { name: "TH III", code: "06", isActive: true },
      { name: "TH Close to Body", code: "07", isActive: true },
      { name: "TH PPP", code: "08", isActive: true },
      { name: "TH Footwear", code: "09", isActive: true },
      { name: "TH Accessories", code: "10", isActive: true },
      { name: "TH LLL", code: "11", isActive: true },
    ],
    fms: {
      season: [
        { code: "SPSU", name: "Spring /Summer" },
        { code: "AAA", name: "Autumn /Summer" },
      ],
      year: "2025",
    },
    salesOrganizationCodes: ["THE1", "INLC"],
    createdOn: "2024-02-29 14:47:13.469",
    modifiedOn: "2024-02-29 14:47:13.469",
  },
  SEASONAL_ASSIGNMENT_C51_CKEU: {
    companyCode: "CKEU",
    name: "Calvin Klein",
    brand: "CK",
    brandName: "Calvin Klein",
    styleSeasonCode: "C51",
    channels: ["SEASONAL_ASSIGNMENT_C51_CKEU"],
    divisions: [
      { name: "CK Menswear", code: "61", isActive: true },
      { name: "CK Jeans", code: "62", isActive: true },
      { name: "CKJ Kids", code: "64", isActive: true },
      { name: "CK Womenswear", code: "65", isActive: true },
      { name: "CK Underwear", code: "67", isActive: true },
      { name: "CK Sport", code: "68", isActive: true },
      { name: "CK Footwear", code: "69", isActive: true },
      { name: "CK Accessories", code: "70", isActive: true },
      { name: "CK Swimwear", code: "77", isActive: true },
    ],
    fms: {
      season: [
        { code: "SPSU", name: "Spring /Summer" },
        { code: "AAA", name: "Autumn /Summer" },
      ],
      year: "2025",
    },
    salesOrganizationCodes: ["CKE1", "INLC"],
    createdOn: "2024-02-29 14:48:13.469",
    modifiedOn: "2024-02-29 14:48:13.469",
  },
  SEASONAL_ASSIGNMENT_C51_MKEU: {
    companyCode: "MKEU",
    name: "Michael Kors",
    brand: "MK",
    brandName: "Michael Kors",
    styleSeasonCode: "C51",
    channels: ["SEASONAL_ASSIGNMENT_C51_MKEU"],
    divisions: [
      { name: "Michael Kors", code: "91", isActive: true },
      { name: "IZOD", code: "92", isActive: true },
    ],
    fms: {
      season: [
        { code: "SPSU", name: "Spring /Summer" },
        { code: "AAA", name: "Autumn /Summer" },
      ],
      year: "2025",
    },
    salesOrganizationCodes: ["MKE1", "INLC"],
    createdOn: "2024-02-29 14:49:13.469",
    modifiedOn: "2024-02-29 14:49:13.469",
  },
  SEASONAL_ASSIGNMENT_C51_NIKE: {
    companyCode: "NIKE",
    name: "Nike",
    brand: "NK",
    brandName: "Nike",
    styleSeasonCode: "C51",
    channels: ["SEASONAL_ASSIGNMENT_C51_NIKE"],
    divisions: [{ name: "Nike Underwear", code: "97", isActive: true }],
    fms: {
      season: [
        { code: "SPSU", name: "Spring /Summer" },
        { code: "AAA", name: "Autumn /Summer" },
      ],
      year: "2025",
    },
    salesOrganizationCodes: ["NKE1", "INLC"],
    createdOn: "2024-02-29 14:50:13.469",
    modifiedOn: "2024-02-29 14:50:13.469",
  },
};

function getAllSeasonalAssignments(call, callback) {
  const allAssignments = Object.values(seasonalData);
  callback(null, { assignments: allAssignments });
}

function getSeasonalAssignment(call, callback) {
  const { styleSeasonCode, companyCode } = call.request;
  const key = `SEASONAL_ASSIGNMENT_${styleSeasonCode}_${companyCode}`;
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

function getDivisionAssignment(call, callback) {
  const { styleSeasonCode, companyCode, divisionCode } = call.request;
  const key = `SEASONAL_ASSIGNMENT_${styleSeasonCode}_${companyCode}`;
  const assignment = seasonalData[key];

  if (assignment) {
    const division = assignment.divisions.find(
      (div) => div.code === divisionCode,
    );
    if (division) {
      const response = {
        ...assignment,
        divisions: undefined, // Remove all divisions
        division: division, // Add the specific division
      };
      callback(null, response);
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: "Division not found",
      });
    }
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
    getAllSeasonalAssignments,
    getSeasonalAssignment,
    getDivisionAssignment,
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
