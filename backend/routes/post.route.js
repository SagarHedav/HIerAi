import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	createPost,
	getFeedPosts,
	deletePost,
	getPostById,
  getPostsByUsername,
	createComment,
	replyToComment,
	toggleCommentLike,
	toggleReplyLike,
	likePost,
  reactToPost,
  getDiscoverPosts,
} from "../controllers/post.controller.js";

const router = express.Router();

router.get("/", protectRoute, getFeedPosts);
router.post("/create", protectRoute, createPost);
router.delete("/delete/:id", protectRoute, deletePost);
router.get("/user/:username", protectRoute, getPostsByUsername);
router.get("/:id", protectRoute, getPostById);
router.post("/:id/comment", protectRoute, createComment);
router.post("/:id/comment/:commentId/reply", protectRoute, replyToComment);
router.post("/:id/comment/:commentId/like", protectRoute, toggleCommentLike);
router.post("/:id/comment/:commentId/replies/:replyId/like", protectRoute, toggleReplyLike);
router.post("/:id/like", protectRoute, likePost);
router.post("/:id/react", protectRoute, reactToPost);
// Discover posts for user
router.get("/discover/me", protectRoute, getDiscoverPosts);

export default router;