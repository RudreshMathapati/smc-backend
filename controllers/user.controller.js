import User from "../models/user.model.js";

// ✅ Get User Profile (Protected)
export const getProfile = async (req, res) => {
  try {
    const userId = req.userId; // Populated by authMiddleware
    console.log("👤 Fetching profile for user:", userId);

    const user = await User.findById(userId).select("-password");
    if (!user) {
      console.log("⚠️ User profile not found:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ User profile fetched:", userId);
    res.status(200).json(user);
  } catch (err) {
    console.error("❌ Profile fetch error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all user from DB
export const getAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find();
    return res.status(200).json({ allUsers, message: "Successfull all users" });
  } catch (error) {
    console.error("Error in get all users in userController", error.message);
    ("");
  }
};

// Update user profile (protected)
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields (only allow safe fields)
    user.name = req.body.name || user.name;
    // user.phone = req.body.phone || user.phone;

    const updatedUser = await user.save();
    
    res.json({
      message: "Profile updated successfully",
      _id: updatedUser._id,
      name: updatedUser.name,
      phone: updatedUser.phone,
      role: updatedUser.role
    });
  } catch (error) {
    console.error("Error in updateProfile in user.controller.js",error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};