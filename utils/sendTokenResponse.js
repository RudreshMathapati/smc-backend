// import jwt from "jsonwebtoken";
// import { config } from "dotenv";
// config();

// export const sendTokenResponse = (res, user) => {
//   const token = jwt.sign(
//     { id: user._id, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );

//   res.cookie("token", token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production", // only https in prod
//     sameSite: "strict",
//     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//   });

//   res.json({
//     success: true,
//     user: { id: user._id, name: user.name, phone: user.phone, role: user.role },
//   });
// };
import jwt from "jsonwebtoken";

export const sendTokenResponse = (res, user, rememberMe) => {
  const expiresIn = rememberMe ? "30d" : "1d";
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,          // REQUIRED for Render/Vercel
    sameSite: "none",      // REQUIRED for cross-site
    maxAge: maxAge,
  });

  res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      username: user.username,
      phone: user.phone,
      role: user.role,
    },
  });
};