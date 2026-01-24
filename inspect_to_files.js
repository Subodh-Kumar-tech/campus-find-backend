const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const inspectRemoteItems = async () => {
    const uri = process.env.MONGO_URI;
    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        const items = await conn.db.collection('items').find({}).limit(1).toArray();

        if (items.length > 0) {
            fs.writeFileSync('item_category.txt', String(items[0].category));
            fs.writeFileSync('item_title.txt', String(items[0].title));
            fs.writeFileSync('item_full.json', JSON.stringify(items[0], null, 2));
        } else {
            fs.writeFileSync('item_category.txt', 'NO ITEMS FOUND');
        }

        await conn.close();
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('error.txt', err.message);
        process.exit(1);
    }
};

inspectRemoteItems();
