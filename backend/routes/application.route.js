import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { applyForJob, getAppliedJobs, getApplicants, updateStatus, scoreApplicationAI, deleteApplication } from "../controllers/application.controller.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Apply to a job (supports resume upload)
router.post("/apply", protectRoute, upload.single('resume'), applyForJob);

// Get applications for current logged-in user
router.get("/me", protectRoute, getAppliedJobs);

// (optional) Get applicants for a specific job (for recruiters/admin)
router.get("/job/:id", protectRoute, getApplicants);

// Update status of an application (recruiters)
router.put("/:id/status", protectRoute, updateStatus);
// Re-score an application with AI (recruiters)
router.put("/:id/score-ai", protectRoute, scoreApplicationAI);
// Delete an application (recruiters)
router.delete("/:id", protectRoute, deleteApplication);

export default router;
