import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // basic answers provided by the applicant
  answers: {
    fullName: String,
    email: String,
    phone: String,
    coverLetter: String,
  },
  // resume metadata
  resume: {
    provider: { type: String, enum: ["upload", "drive"], default: "upload" },
    url: String, // uploaded file url
    filename: String,
    mimeType: String,
    size: Number,
    driveLink: String, // if provider === 'drive'
  },
  resumeTextNormalized: { type: String, default: "" },
  resumeScore: { type: Number, default: null },
  aiSummary: { type: String, default: "" },
  aiDetails: { type: Object, default: {} },
  aiProvider: { type: String, default: "" },
  aiScoredAt: { type: Date },
  status: {
    type: String,
    enum: ["applied", "reviewed", "accepted", "rejected"],
    default: "applied",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Application = mongoose.model("Application", applicationSchema);