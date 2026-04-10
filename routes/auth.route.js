import express from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    firebaseAuth,
} from "../controllers/auth.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

// Local authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", protect, getCurrentUser);
router.put("/change-password", changePassword);
// Firebase token exchange route (client sends Firebase ID token)
// Firebase auth route removed

// Example admin-only route
// router.get("/admin", protect, adminOnly, (req, res) => {
//   res.json({ message: "Welcome Admin" });
// });

export default router;

// import express from "express";
// import {
//   registerUser,
//   loginUser,
//   logoutUser,
//   getCurrentUser,
//   googleAuth,
// } from "../controllers/auth.controller.js";
// import { protect , adminOnly} from "../middleware/auth.middleware.js";

// const router = express.Router();

// // Local Authentication
// router.post("/register", registerUser);
// router.post("/login", loginUser);

// // Third-party Authentication
// router.post("/google", googleAuth);

// // Session Management
// router.post("/logout", logoutUser);
// router.get("/me", protect, getCurrentUser);

// export default router;
