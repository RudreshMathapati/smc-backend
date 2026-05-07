import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });


import User from "../models/user.model.js";

const updateUsers = async () => {

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const users = await User.find({ username: { $exists: false } });
        console.log(`Found ${users.length} users without username`);

        for (const user of users) {
            user.username = user.name;
            await user.save();
            console.log(`Updated user ${user.name} with username ${user.username}`);
        }

        console.log("Finished updating users");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

updateUsers();
