import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { config } from "dotenv";
config();

export const protect = async (req, res, next) => {
  let token;

  // First check cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // Fallback: Authorization header (optional)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (err) {
    console.error("Error in protect middleware:", err.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin access only" });
  }
};
