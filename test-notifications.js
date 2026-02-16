require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');
const Notification = require('./models/Notification');
const { claimItem } = require('./controllers/itemController');

async function testClaimNotification() {
    console.log("Starting claim notification test...");

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        // 1. Find a test item or create one
        let testItem = await Item.findOne({ postedBy: { $exists: true, $ne: "" } });
        if (!testItem) {
            testItem = await Item.create({
                title: "Test Wallet",
                description: "Black leather wallet",
                category: "found",
                postedBy: process.env.EMAIL_USER
            });
        }

        console.log(`Using test item: ${testItem.title} (ID: ${testItem._id}) posted by ${testItem.postedBy}`);

        // Mock req/res
        const req = {
            params: { id: testItem._id },
            body: {
                claimantName: "Test User",
                claimantContact: "test@example.com",
                proofAnswer: "I lost this near the library."
            }
        };
        const res = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.data = data; return this; }
        };

        // 2. Trigger Claim
        await claimItem(req, res);
        console.log("Claim process finished.");

        // 3. Verify Notification exists
        const notification = await Notification.findOne({
            userId: testItem.postedBy,
            relatedItemId: testItem._id,
            type: "claim_update"
        }).sort({ createdAt: -1 });

        if (notification) {
            console.log("✅ DB Notification created successfully!");
            console.log("Message:", notification.message);
        } else {
            console.log("❌ DB Notification NOT found.");
        }

        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");

    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

testClaimNotification();
