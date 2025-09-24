import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
	try {
		let token = null;
		// Check for token in cookie
		if (req.cookies && req.cookies["hierai"]) {
			token = req.cookies["hierai"];
		}
		// Check for token in Authorization header
		else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
			token = req.headers.authorization.split(" ")[1];
		}

		if (!token) {
			return res.status(401).json({ message: "Unauthorized - No Token Provided" });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		if (!decoded) {
			return res.status(401).json({ message: "Unauthorized - Invalid Token" });
		}

		const user = await User.findById(decoded.userId).select("-password");

		if (!user) {
			return res.status(401).json({ message: "User not found" });
		}
		req.user = user;

		next();
	} catch (error) {
		console.log("Error in protectRoute middleware:", error.message);
		// If DB is not reachable or DNS fails, surface 503 instead of 401
		const msg = String(error?.message || '').toLowerCase()
		const isDbOffline =
			msg.includes('enotfound') ||
			msg.includes('econnrefused') ||
			msg.includes('timed out') ||
			(error?.name || '').toLowerCase().includes('mongonetwork') ||
			(error?.name || '').toLowerCase().includes('mongoserverselection')
		if (isDbOffline) {
			return res.status(503).json({ message: 'Database not reachable. Please try again shortly.' })
		}
		res.status(401).json({ message: "Unauthorized - Invalid or Expired Token" });
	}
};
