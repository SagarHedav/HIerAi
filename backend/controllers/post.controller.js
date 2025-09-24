import cloudinary from "../lib/cloudinary.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import { sendCommentNotificationEmail } from "../emails/emailHandlers.js";

export const getFeedPosts = async (req, res) => {
	try {
		const posts = await Post.find({ author: { $in: [...req.user.connections, req.user._id] } })
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture")
			.sort({ createdAt: -1 });

		res.status(200).json(posts);
	} catch (error) {
		console.error("Error in getFeedPosts controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const createPost = async (req, res) => {
	try {
		const { content, image } = req.body;
		let newPost;

		if (image) {
			const imgResult = await cloudinary.uploader.upload(image);
			newPost = new Post({
				author: req.user._id,
				content,
				image: imgResult.secure_url,
			});
		} else {
			newPost = new Post({
				author: req.user._id,
				content,
			});
		}

		await newPost.save();

		res.status(201).json(newPost);
	} catch (error) {
		console.error("Error in createPost controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const deletePost = async (req, res) => {
	try {
		const postId = req.params.id;
		const userId = req.user._id;

		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ message: "Post not found" });
		}

		// check if the current user is the author of the post
		if (post.author.toString() !== userId.toString()) {
			return res.status(403).json({ message: "You are not authorized to delete this post" });
		}

		// delete the image from cloudinary as well!
		if (post.image) {
			await cloudinary.uploader.destroy(post.image.split("/").pop().split(".")[0]);
		}

		await Post.findByIdAndDelete(postId);

		res.status(200).json({ message: "Post deleted successfully" });
	} catch (error) {
		console.log("Error in delete post controller", error.message);
		res.status(500).json({ message: "Server error" });
	}
};

export const getPostById = async (req, res) => {
	try {
		const postId = req.params.id;
		let post = await Post.findById(postId)
			.populate("author", "name username profilePicture headline")
			.populate("comments.user", "name profilePicture username headline")
			.populate("comments.replies.user", "name profilePicture username headline")
			.populate("comments.replies.replyToUser", "name username");

		if (!post) return res.status(404).json({ message: 'Post not found' })
		// Sort comments by likes desc then createdAt desc
		post = post.toObject();
		post.comments = (post.comments||[]).sort((a,b)=>{
			const la = (a.likes||[]).length, lb = (b.likes||[]).length;
			if (lb !== la) return lb-la;
			return new Date(b.createdAt) - new Date(a.createdAt);
		});
		res.status(200).json(post);
	} catch (error) {
		console.error("Error in getPostById controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const createComment = async (req, res) => {
	try {
		const postId = req.params.id;
		const { content } = req.body;
		if (!content || !content.trim()) return res.status(400).json({ message: 'content required' })

		const post = await Post.findByIdAndUpdate(
			postId,
			{
				$push: { comments: { user: req.user._id, content: content.trim(), likes: [], replies: [] } },
			},
			{ new: true }
		).populate("author", "name email username headline profilePicture");

		// create a notification if the comment owner is not the post owner
		if (post.author._id.toString() !== req.user._id.toString()) {
			const newNotification = new Notification({
				recipient: post.author,
				type: "comment",
				relatedUser: req.user._id,
				relatedPost: postId,
			});

			await newNotification.save();

			try {
				const postUrl = process.env.CLIENT_URL + "/post/" + postId;
				await sendCommentNotificationEmail(
					post.author.email,
					post.author.name,
					req.user.name,
					postUrl,
					content
				);
			} catch (error) {
				console.log("Error in sending comment notification email:", error);
			}
		}

		res.status(200).json(post);
	} catch (error) {
		console.error("Error in createComment controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const replyToComment = async (req, res) => {
	try {
		const { id: postId, commentId } = req.params;
		const { content, replyToUser } = req.body;
		if (!content || !content.trim()) return res.status(400).json({ message: 'content required' })
		const update = await Post.findOneAndUpdate(
			{ _id: postId, 'comments._id': commentId },
			{ $push: { 'comments.$.replies': { content: content.trim(), user: req.user._id, replyToUser: replyToUser || null, likes: [] } } },
			{ new: true }
		).populate("author", "name username profilePicture headline");
		if (!update) return res.status(404).json({ message: 'Comment not found' })
		return res.json(update);
	} catch (e) {
		console.error('replyToComment error', e)
		res.status(500).json({ message: 'Server error' })
	}
}

export const toggleCommentLike = async (req, res) => {
	try {
		const { id: postId, commentId } = req.params;
		const userId = req.user._id;
		const post = await Post.findById(postId).select('comments');
		if (!post) return res.status(404).json({ message: 'Post not found' });
		const c = post.comments.id(commentId);
		if (!c) return res.status(404).json({ message: 'Comment not found' });
		const has = c.likes.some(u => u.toString() === userId.toString());
		if (has) c.likes = c.likes.filter(u => u.toString() !== userId.toString())
		else c.likes.push(userId);
		await post.save();
		res.json({ liked: !has, likes: c.likes.length });
	} catch (e) {
		console.error('toggleCommentLike error', e)
		res.status(500).json({ message: 'Server error' })
	}
}

export const toggleReplyLike = async (req, res) => {
	try {
		const { id: postId, commentId, replyId } = req.params;
		const userId = req.user._id;
		const post = await Post.findById(postId).select('comments');
		if (!post) return res.status(404).json({ message: 'Post not found' });
		const c = post.comments.id(commentId);
		if (!c) return res.status(404).json({ message: 'Comment not found' });
		const r = c.replies.id(replyId);
		if (!r) return res.status(404).json({ message: 'Reply not found' });
		const has = r.likes.some(u => u.toString() === userId.toString());
		if (has) r.likes = r.likes.filter(u => u.toString() !== userId.toString())
		else r.likes.push(userId);
		await post.save();
		res.json({ liked: !has, likes: r.likes.length });
	} catch (e) {
		console.error('toggleReplyLike error', e)
		res.status(500).json({ message: 'Server error' })
	}
}

export const getDiscoverPosts = async (req, res) => {
	try {
		const me = await (await import('../models/user.model.js')).default.findById(req.user._id).select('connections headline about skills');
		const notAuthors = [req.user._id, ...(me?.connections||[])];
		const text = [me?.headline||'', me?.about||'', ...(me?.skills||[])].join(' ').trim();
		const words = Array.from(new Set((text.toLowerCase().match(/[a-z0-9+#.-]{3,}/g) || []).slice(0, 25)));
		const regex = words.length ? new RegExp(words.join('|'), 'i') : null;
		const query = { author: { $nin: notAuthors } };
		if (regex) query['$or'] = [{ content: regex }];
		const posts = await Post.find(query)
		  .populate('author', 'name username profilePicture headline')
		  .sort({ createdAt: -1 })
		  .limit(20);
		res.json(posts);
	} catch (e) {
		console.error('getDiscoverPosts error', e)
		res.status(500).json({ message: 'Server error' })
	}
}

// override getPostById to sort comments by likes desc then recency

export const getPostsByUsername = async (req, res) => {
  try {
    const username = req.params.username;
    // lazy import to avoid circular imports
    const { default: User } = await import('../models/user.model.js');
    const user = await User.findOne({ username }).select('_id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const posts = await Post.find({ author: user._id })
      .populate('author', 'name username profilePicture headline')
      .populate('comments.user', 'name profilePicture username headline')
      .sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error('Error in getPostsByUsername controller:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const likePost = async (req, res) => {
	try {
		const postId = req.params.id;
		const post = await Post.findById(postId);
		const userId = req.user._id;

		if (post.likes.includes(userId)) {
			// unlike the post
			post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
		} else {
			// like the post
			post.likes.push(userId);
			// also sync reactions.like for compatibility
			if (!post.reactions) post.reactions = { like: [], love: [], clap: [], laugh: [], wow: [] };
			if (!post.reactions.like.some(id => id.toString() === userId.toString())) {
				post.reactions.like.push(userId);
			}
			// create a notification if the post owner is not the user who liked
			if (post.author.toString() !== userId.toString()) {
				const newNotification = new Notification({
					recipient: post.author,
					type: "like",
					relatedUser: userId,
					relatedPost: postId,
				});

				await newNotification.save();
			}
		}

		await post.save();

		res.status(200).json(post);
	} catch (error) {
		console.error("Error in likePost controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const reactToPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { type } = req.body; // 'like' | 'love' | 'clap' | 'laugh' | 'wow'
    const allowed = ['like','love','clap','laugh','wow'];
    if (!allowed.includes(type)) return res.status(400).json({ message: 'Invalid reaction' });
    const post = await Post.findById(postId);
    if (!post.reactions) post.reactions = { like: [], love: [], clap: [], laugh: [], wow: [] };
    const userId = req.user._id.toString();

    // remove user from all reactions first
    for (const key of allowed) {
      post.reactions[key] = (post.reactions[key] || []).filter(id => id.toString() !== userId);
    }
    // toggle: if user already had 'type' we leave them with none; else add to type
    // But since we removed from all, adding back only if previously not in that type
    const already = false; // after removal, it's always false
    if (!already) {
      post.reactions[type].push(req.user._id);
    }
    // keep legacy likes in sync with 'like'
    if (type === 'like') {
      if (!post.likes.some(id => id.toString() === userId)) post.likes.push(req.user._id);
    } else {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    }

    await post.save();
    res.json(post);
  } catch (error) {
    console.error('Error in reactToPost:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
