require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
    console.log("Testing connection to:", process.env.MONGO_URI ? "URI found" : "URI MISSING");
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log("✅ Successfully connected to MongoDB!");
        await mongoose.disconnect();
        console.log("✅ Successfully disconnected.");
    } catch (error) {
        console.error("❌ Connection failed!");
        console.error(error);
        process.exit(1);
    }
}

testConnection();
