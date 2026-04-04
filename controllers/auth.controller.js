import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { sendTokenResponse } from "../utils/sendTokenResponse.js";

export const registerUser = async (req, res) => {
    try {
        const { name, phone, password } = req.body;

        const existingUser = await User.findOne({ phone });
        if (existingUser)
            return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            phone,
            password: hashedPassword,
        });

        sendTokenResponse(res, user);
    } catch (err) {
        console.log(
            "Error in registerUser in auth.controller.js\n",
            err.message,
        );
        res.status(500).json({ message: err.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { phone, password } = req.body;

        const user = await User.findOne({ phone });
        if (!user)
            return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(400).json({ message: "Invalid credentials" });
        sendTokenResponse(res, user);
    } catch (err) { 
        console.log("Error in loginUser in auth.controller.js\n", err.message);
        res.status(500).json({ message: err.message });
    }
};

// Firebase removed

export const logoutUser = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });
    res.json({ success: true, message: "Logged out" });
};

// Handle Firebase ID token sent from client. Verify token with Firebase Admin,
// then create or find corresponding user in the DB and send a JWT cookie.
export const firebaseAuth = async (req, res) => {
    // Firebase endpoint removed. Keep for compatibility but respond with 410 Gone.
    res.status(410).json({
        message:
            "Firebase authentication endpoint has been removed. Use phone/password or other OAuth provider configured on the backend.",
    });
};

export const getCurrentUser = async (req, res) => {
    try {
        // `req.user` is set in protect middleware
        res.status(200).json({
            success: true,
            user: req.user,
        });
    } catch (error) {
        console.error("Get current user error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
