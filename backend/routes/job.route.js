import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getAdminJobs, getAllJobs, getJobById, postJob } from "../controllers/job.controller.js";

const router = express.Router();

router.route("/post").post(protectRoute, postJob);
// Allow public access to get all jobs
router.route("/get").get(getAllJobs);
router.route("/getadminjobs").get(protectRoute, getAdminJobs);
router.route("/get/:id").get(protectRoute, getJobById);

export default router;
