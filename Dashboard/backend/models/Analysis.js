const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// This sub-schema defines the structure for one "critical point"
const CriticalPointSchema = new Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    explanation: {
      type: String,
      required: true,
      trim: true,
    },
    risk_level: {
      type: String,
      required: true,
      enum: ["HIGH", "MEDIUM", "LOW", "NEUTRAL"], // Ensures only these values are allowed
    },
    original_snippet: {
      type: String,
      trim: true,
    },
  },
  { _id: false } // Don't create separate _id for each critical point
);

// This is the main schema for each analysis document
const AnalysisSchema = new Schema(
  {
    // This links the analysis to the specific user from Clerk
    userId: {
      type: String,
      required: true,
      index: true, // Add an index for faster querying by userId
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    // This is an array of the sub-schema defined above
    critical_points: [CriticalPointSchema],
  },
  {
    // This automatically adds `createdAt` and `updatedAt` fields.
    // We will use `createdAt` as the "analyzedAt" date.
    timestamps: true,
  }
);

// Create the model from the schema
const Analysis = mongoose.model("Analysis", AnalysisSchema);

module.exports = Analysis;
