const mongoose = require('mongoose');
require('dotenv').config();

const checkTestDB = async () => {
    // Construct URI for 'test' DB by replacing 'lostfound' with 'test'
    let uri = process.env.MONGO_URI;
    uri = uri.replace('lostfound', 'test');

    console.log("Checking DB: test");

    try {
        const conn = await mongoose.createConnection(uri).asPromise();

        const usersCount = await conn.db.collection('users').countDocuments();
        console.log(`Users in 'test': ${usersCount}`);

        const itemsCount = await conn.db.collection('items').countDocuments();
        console.log(`Items in 'test': ${itemsCount}`);

        // Also check 'members' just in case
        const membersCount = await conn.db.collection('members').countDocuments();
        console.log(`Members in 'test': ${membersCount}`);

        await conn.close();
    } catch (err) {
        console.log("Connection failed:", err.message);
    }
};

checkTestDB();
