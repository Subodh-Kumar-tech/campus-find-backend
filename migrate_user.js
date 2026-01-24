const mongoose = require('mongoose');
require('dotenv').config();

const EMAIL = "geck2@gmail.com";

const migrateUser = async () => {
    let uri = process.env.MONGO_URI;

    // URIs for source and destination
    const sourceUri = uri.replace(/\/[^/?]+(\?|$)/, `/lostfound$1`);
    const destUri = uri.replace(/\/[^/?]+(\?|$)/, `/test$1`);

    console.log("Migrating user from 'lostfound' to 'test'...");

    try {
        // 1. Fetch from Source
        const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
        const user = await sourceConn.db.collection('users').findOne({ email: EMAIL });
        await sourceConn.close();

        if (!user) {
            console.error(`User ${EMAIL} not found in source DB!`);
            return;
        }
        console.log(`Found user: ${user.fullName} (${user._id})`);

        // 2. Insert into Destination
        const destConn = await mongoose.createConnection(destUri).asPromise();

        // Check if already exists to avoid duplicate key error
        const existing = await destConn.db.collection('users').findOne({ email: EMAIL });
        if (existing) {
            console.log("User already exists in destination. Skipping insertion.");
        } else {
            await destConn.db.collection('users').insertOne(user);
            console.log("User successfully copied to 'test' database! ✅");
        }

        await destConn.close();

    } catch (err) {
        console.error("Migration failed:", err.message);
    }
};

migrateUser();
