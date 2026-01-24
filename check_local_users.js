const mongoose = require('mongoose');

const checkLocalUsers = async () => {
    const localUri = "mongodb://localhost:27017/lostfound";
    try {
        const conn = await mongoose.createConnection(localUri).asPromise();
        console.log("Connected to Local lostfound.");
        const usersCount = await conn.db.collection('users').countDocuments();
        console.log(`Users count: ${usersCount}`);

        const itemsCount = await conn.db.collection('items').countDocuments();
        console.log(`Items count: ${itemsCount}`);

        await conn.close();
    } catch (err) {
        console.log("Local connection failed:", err.message);
    }
};

checkLocalUsers();
