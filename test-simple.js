require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function testSimpleBidirectional() {
    console.log("Starting simplified bidirectional test...");
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const user1 = "test_user1@example.com";
        const user2 = "test_user2@example.com";
        const item1Id = new mongoose.Types.ObjectId();
        const item2Id = new mongoose.Types.ObjectId();

        // Simulate logic in controller
        const msgForExisting = `Potential Match Found: Someone found an item matching your lost "Blue Wallet"!`;
        const msgForNew = `Potential Match Found: Someone already lost an item matching what you just found: "Found Black Wallet"`;

        await Notification.create({
            userId: user1,
            message: msgForExisting,
            type: "match_found",
            relatedItemId: item2Id
        });

        await Notification.create({
            userId: user2,
            message: msgForNew,
            type: "match_found",
            relatedItemId: item1Id
        });

        console.log("✅ Successfully created notifications for both users.");

        const results = await Notification.find({ userId: { $in: [user1, user2] } }).sort({ createdAt: -1 });
        results.forEach(n => console.log(`User: ${n.userId} | Message: ${n.message}`));

        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Simplified test failed:", error);
    }
}
testSimpleBidirectional();
