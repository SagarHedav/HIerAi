import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getCompany, getCompanyById, registerCompany, updateCompany } from "../controllers/company.controller.js";
// import { singleUpload } from "../middleware/mutler.js";

const router = express.Router();

router.route("/register").post(protectRoute,registerCompany);
router.route("/get").get(protectRoute,getCompany);
router.route("/get/:id").get(protectRoute,getCompanyById);
router.route("/update/:id").put(protectRoute,updateCompany);

export default router;
