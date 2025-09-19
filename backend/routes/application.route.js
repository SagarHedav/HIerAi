import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { applyForJob } from "../controllers/application.controller.js";

const router = express.Router();

router.post("/apply", protectRoute, applyForJob);

export default router;
