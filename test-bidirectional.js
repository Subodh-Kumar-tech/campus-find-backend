require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');
const Notification = require('./models/Notification');
const User = require('./models/User');
const { createItem } = require('./controllers/itemController');

async function testBidirectionalMatch() {
    console.log("Starting bidirectional match test...");

    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined in .env");
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB.");

        const user1Email = "user1@example.com";
        const user2Email = "user2@example.com";

        // 1. Ensure test users exist
        await User.findOneAndUpdate({ email: user1Email }, { fullName: "User One", password: "123" }, { upsert: true });
        await User.findOneAndUpdate({ email: user2Email }, { fullName: "User Two", password: "123" }, { upsert: true });
        console.log("✅ Test users synchronized.");

        // 2. Clear previous test data
        await Item.deleteMany({ postedBy: { $in: [user1Email, user2Email] } });
        await Notification.deleteMany({ userId: { $in: [user1Email, user2Email] } });
        console.log("✅ Previous test data cleared.");

        // 3. User 1 posts a LOST item
        console.log("Step 1: User 1 reporting a LOST item...");
        const lostItem = await Item.create({
            title: "Unique Blue Umbrella",
            category: "lost",
            postedBy: user1Email,
            location: "Main Gate"
        });
        console.log(`✅ Lost item created: ID ${lostItem._id}`);

        // 4. User 2 posts a FOUND item matching User 1
        console.log("Step 2: User 2 reporting a FOUND item...");
        const req = {
            body: {
                title: "Unique Blue Umbrella",
                category: "found",
                postedBy: user2Email,
                location: "Main Gate"
            }
        };
        const res = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.data = data; return this; }
        };

        await createItem(req, res);
        console.log("✅ Claim process finished.");

        // 5. Verify Notifications
        console.log("Step 3: Checking notifications in DB...");

        const notif1 = await Notification.findOne({ userId: user1Email, type: "match_found" }).sort({ createdAt: -1 });
        const notif2 = await Notification.findOne({ userId: user2Email, type: "match_found" }).sort({ createdAt: -1 });

        if (notif1) {
            console.log("✅ User 1 (Loser) notified:", notif1.message);
        } else {
            console.log("❌ User 1 NOT notified.");
        }

        if (notif2) {
            console.log("✅ User 2 (Finder) notified:", notif2.message);
        } else {
            console.log("❌ User 2 NOT notified.");
        }

        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB.");

    } catch (error) {
        console.error("❌ Test failed!");
        console.error(error);
        process.exit(1);
    }
}

testBidirectionalMatch();
