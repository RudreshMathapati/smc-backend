import jwt from "jsonwebtoken";
import Conductor from "../models/conductors.model.js";
import { config } from "dotenv";

config();

/**
 * Middleware: Protect conductor routes.
 * Reads "Authorization: Bearer <token>" header.
 * Verifies the token, fetches conductor from DB, and attaches to req.conductor.
 */
export const conductorProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized. Please log in again." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const conductor = await Conductor.findById(decoded.conductorId).select(
      "-password"
    );

    if (!conductor) {
      return res
        .status(401)
        .json({ message: "Conductor not found. Please log in again." });
    }

    req.conductor = conductor;
    next();
  } catch (err) {
    console.error("❌ Conductor Auth Middleware Error:", err.message);
    return res
      .status(401)
      .json({ message: "Token expired or invalid. Please log in again." });
  }
};
