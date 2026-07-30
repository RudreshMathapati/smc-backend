import mongoose from "mongoose";
import { config } from "dotenv";
config();

const connectDB = async () => {
  try {
    const con = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${con.connection.host}`);
    
    // Drop the old shiftassignments index to let mongoose build the partial index correctly
    try {
      await mongoose.connection.db.collection("shiftassignments").dropIndex("personId_1_shift_1");
      console.log("✅ Successfully dropped old shiftassignments index");
    } catch (e) {
      console.log("ℹ️ Old shiftassignments index not found or already dropped");
    }
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1); // Stop the server if DB fails
  }
};

export default connectDB;
