import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("[auth] JWT_SECRET is missing");
      return res.status(500).json({ success: false, message: "Server auth misconfigured" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[auth] missing/invalid Authorization header", { hasHeader: Boolean(authHeader) });
      return res.status(401).json({ success: false, message: "No token or invalid format" });
    }

    const token = authHeader.split(" ")[1];
    console.log("[auth] verifying token", { tokenPrefix: token?.slice(0, 12) });

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      ignoreExpiration: false,
    });
    console.log("[auth] token decoded", { userId: decoded?.userId, role: decoded?.role });

    const user = await User.findById(decoded.userId).select("-password -__v").lean();

    if (!user || user.status !== "active") {
      console.log("[auth] user inactive or missing", { userId: decoded?.userId, status: user?.status });
      return res.status(401).json({ success: false, message: "User not found or inactive" });
    }

    req.user = {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan,
    };

    next();
  } catch (err) {
    console.error("[auth] middleware error:", err);
    const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ success: false, message });
  }
};

export default authMiddleware;