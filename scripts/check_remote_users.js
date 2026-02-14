const mongoose = require('mongoose');
require('dotenv').config();

const checkRemoteUsers = async () => {
    const uri = process.env.MONGO_URI;
    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        console.log("Connected to Remote.");
        const usersCount = await conn.db.collection('users').countDocuments();
        console.log(`Remote Users count: ${usersCount}`);

        const itemsCount = await conn.db.collection('items').countDocuments();
        console.log(`Remote Items count: ${itemsCount}`);

        await conn.close();
    } catch (err) {
        console.log("Remote connection failed:", err.message);
    }
};

checkRemoteUsers();
