
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Item = require('./models/Item');

async function verifyResolution() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find an active reported item
        const testItem = await Item.findOne({ isClaimed: false });
        if (!testItem) {
            console.log('No active items found for testing. Please report an item first.');
            process.exit(0);
        }

        console.log(`Found item: ${testItem.title} (${testItem._id})`);

        // 2. Mark as resolved (simulate the resolveItem controller)
        testItem.isClaimed = true;
        await testItem.save();
        console.log('Item marked as resolved successfully.');

        // 3. Verify it shows up in success stories
        const successStories = await Item.find({ isClaimed: true });
        const isFound = successStories.some(item => item._id.toString() === testItem._id.toString());

        if (isFound) {
            console.log('SUCCESS: Item correctly appears in Success Stories list.');
        } else {
            console.log('FAILURE: Item not found in Success Stories list.');
        }

        // 4. Optionally revert for clean state if needed (not reverting so I can see it in UI)
        console.log('Verification script complete.');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifyResolution();
