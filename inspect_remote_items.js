const mongoose = require('mongoose');
require('dotenv').config();

const inspectRemoteItems = async () => {
    const uri = process.env.MONGO_URI;
    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        console.log("Connected to Remote.");

        const items = await conn.db.collection('items').find({}).limit(1).toArray();
        console.log("Found", items.length, "items.");
        if (items.length > 0) {
            console.log("CATEGORY:", items[0].category);
            console.log("TITLE:", items[0].title);
            console.log("FULL ITEM:", JSON.stringify(items[0]));
        }

        await conn.close();
    } catch (err) {
        console.log("Remote connection failed:", err.message);
    }
};

inspectRemoteItems();
