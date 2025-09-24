import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getSuggestedConnections = async (req, res) => {
	try {
		const me = await User.findById(req.user._id).select("connections experience education");
		const companies = (me.experience||[]).map(e => (e.company||'').toLowerCase()).filter(Boolean);
		const schools = (me.education||[]).map(e => (e.school||'').toLowerCase()).filter(Boolean);
		const myConns = me.connections || [];
		const blocked = [req.user._id, ...myConns];

		const pipeline = [
			{ $match: { _id: { $nin: blocked } } },
			{ $addFields: {
				expCompanies: { $map: { input: { $ifNull: ["$experience", []] }, as: 'e', in: { $toLower: { $ifNull: ["$$e.company", ""] } } } },
				eduSchools: { $map: { input: { $ifNull: ["$education", []] }, as: 'e', in: { $toLower: { $ifNull: ["$$e.school", ""] } } } }
			}},
			{ $addFields: {
				companyScore: { $size: { $setIntersection: ["$expCompanies", companies] } },
				schoolScore: { $size: { $setIntersection: ["$eduSchools", schools] } },
				mutualScore: { $size: { $setIntersection: [ "$connections", myConns ] } },
				score: { $add: [ { $multiply: ["$companyScore", 2] }, "$schoolScore", { $multiply: ["$mutualScore", 3] } ] }
			}},
			{ $match: { score: { $gt: 0 } } },
			{ $project: { name:1, username:1, profilePicture:1, headline:1, score:1, companyScore:1, schoolScore:1, mutualScore:1 } },
			{ $sort: { score: -1, mutualScore: -1, companyScore: -1, createdAt: -1 } },
			{ $limit: 8 }
		];

		let suggestedUser = [];
		if ((companies.length === 0 && schools.length === 0)) {
			// No profile data to match on; fallback right away
			suggestedUser = await User.find({ _id: { $nin: blocked } })
			  .select('name username profilePicture headline')
			  .sort({ createdAt: -1 })
			  .limit(8);
		} else {
			suggestedUser = await User.aggregate(pipeline);
			if (!suggestedUser || suggestedUser.length === 0) {
				// Fallback when no overlaps found
				suggestedUser = await User.find({ _id: { $nin: blocked } })
				  .select('name username profilePicture headline')
				  .sort({ createdAt: -1 })
				  .limit(8);
			}
		}
		res.json(suggestedUser);
	} catch (error) {
		console.error("Error in getSuggestedConnections controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const suggestIntro = async (req, res) => {
  try {
    const toUserId = req.params.userId || req.body.toUserId
    const me = await User.findById(req.user._id).select('name headline skills')
    const them = await User.findById(toUserId).select('name headline experience education')
    const myName = me?.name || 'I'
    const myHeadline = me?.headline || ''
    const theirName = them?.name || 'there'
    const theirHeadline = them?.headline || ''
    const lastCompany = (them?.experience||[])[0]?.company || ''
    const lastSchool = (them?.education||[])[0]?.school || ''

    const prompt = `Write a friendly, concise 2–3 sentence intro to request a professional connection.\n`+
      `Me: ${myName}, role: ${myHeadline}.\nRecipient: ${theirName}, role: ${theirHeadline}.`+
      (lastCompany?` Last company: ${lastCompany}.`:'')+
      (lastSchool?` School: ${lastSchool}.`:'')+
      `\nTone: authentic and specific. No fluff. 2–3 sentences.`

    let text = `Hi ${theirName.split(' ')[0]}, I enjoyed learning about your work${lastCompany?` at ${lastCompany}`:''}. `+
               `I’m ${myName}${myHeadline?`, ${myHeadline}`:''} and would love to connect to share insights and opportunities. `+
               `Happy to keep it brief and helpful.`
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const key = process.env.GEMINI_API_KEY
      if (key) {
        const genAI = new GoogleGenerativeAI(key)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const resp = await model.generateContent([{ text: prompt }])
        text = resp.response.text().replace(/^"|"$/g,'').trim()
      }
    } catch {}
    res.json({ intro: text })
  } catch (e) {
    console.error('suggestIntro error', e)
    res.status(500).json({ message: 'Server error' })
  }
}

export const getPublicProfile = async (req, res) => {
	try {
		const user = await User.findOne({ username: req.params.username })
      .select("-password")
      .populate({ path: 'connections', select: 'name username profilePicture headline' });

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.json(user);
	} catch (error) {
		console.error("Error in getPublicProfile controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const updateProfile = async (req, res) => {
	try {
		const allowedFields = [
			"name",
			"username",
			"headline",
			"about",
			"location",
			"profilePicture",
			"bannerImg",
			"skills",
			"experience",
			"education",
			"phoneNumber",
		];

		const updatedData = {};

		for (const field of allowedFields) {
			if (req.body[field]) {
				updatedData[field] = req.body[field];
			}
		}

		if (req.body.profilePicture) {
			const result = await cloudinary.uploader.upload(req.body.profilePicture);
			updatedData.profilePicture = result.secure_url;
		}

		if (req.body.bannerImg) {
			const result = await cloudinary.uploader.upload(req.body.bannerImg);
			updatedData.bannerImg = result.secure_url;
		}
		console.log(updatedData);
		const user = await User.findByIdAndUpdate(req.user._id, { $set: updatedData }, { new: true }).select(
			"-password"
		);

		res.json(user);
	} catch (error) {
		console.error("Error in updateProfile controller:", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const searchUsers = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const regex = new RegExp(q, 'i');
    const users = await User.find({
      $or: [ { username: regex }, { name: regex } ]
    }).select('name username profilePicture headline').limit(8);
    res.json(users);
  } catch (error) {
    console.error('Error in searchUsers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Bookmarks
export const toggleBookmark = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = await User.findById(req.user._id).select('bookmarks');
    const has = user.bookmarks.some(id => id.toString() === postId);
    if (has) {
      user.bookmarks = user.bookmarks.filter(id => id.toString() !== postId);
    } else {
      user.bookmarks.push(postId);
    }
    await user.save();
    res.json({ bookmarked: !has, bookmarks: user.bookmarks });
  } catch (error) {
    console.error('Error in toggleBookmark:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'bookmarks',
      populate: { path: 'author', select: 'name username profilePicture headline' }
    });
    res.json(user.bookmarks || []);
  } catch (error) {
    console.error('Error in getBookmarks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
