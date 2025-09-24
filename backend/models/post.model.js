import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
	content: { type: String },
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
	replyToUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
	likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
	createdAt: { type: Date, default: Date.now },
}, { _id: true });

const commentSchema = new mongoose.Schema({
	content: { type: String },
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
	likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
	replies: [replySchema],
	createdAt: { type: Date, default: Date.now },
}, { _id: true });

const postSchema = new mongoose.Schema(
	{
		author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		content: { type: String },
		image: { type: String },
		likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
		reactions: {
			like: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
			love: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
			clap: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
			laugh: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
			wow: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
		},
		comments: [commentSchema],
	},
	{ timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

export default Post;