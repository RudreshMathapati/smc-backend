import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },

        // Phone (for normal users)
        phone: {
            type: String,
            unique: true,
            sparse: true, // allows null for admins
            match: [/^\d{10}$/, "Phone number must be 10 digits"],
        },

        // Email (for admins or email-based users)
        email: {
            type: String,
            unique: true,
            sparse: true, // allows null for phone-based users
            match: [/.+@.+\..+/, "Please enter a valid email address"],
        },

        // Password: not required for Firebase-created users; will be present for local phone/password users
        password: { type: String },

        // Role: 'USER' or 'ADMIN'
        role: {
            type: String,
            enum: ["USER", "ADMIN"],
            default: "USER",
        },
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
