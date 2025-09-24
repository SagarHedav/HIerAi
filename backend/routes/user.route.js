import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getSuggestedConnections, getPublicProfile, updateProfile, searchUsers, toggleBookmark, getBookmarks, suggestIntro} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/suggestions", protectRoute, getSuggestedConnections);
router.get("/search", protectRoute, searchUsers);
router.get("/:username", protectRoute, getPublicProfile);

router.put("/profile", protectRoute, updateProfile);

// bookmarks
router.post("/bookmarks/:postId", protectRoute, toggleBookmark);
router.get("/bookmarks", protectRoute, getBookmarks);

// AI intro suggest
router.post('/intro-suggest/:userId', protectRoute, suggestIntro);

export default router;