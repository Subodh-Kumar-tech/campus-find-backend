const mongoose = require('mongoose');
require('dotenv').config();

const checkRemote = async () => {
    console.log("--- CIECK REMOTE ---");
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.log("No MONGO_URI found");
        return;
    }
    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        console.log("Connected to Remote.");
        const admin = conn.db.admin();
        const dbs = await admin.listDatabases();
        console.log("Remote Databases:", dbs.databases.map(d => d.name).join(', '));
        await conn.close();
    } catch (err) {
        console.log("Remote connection failed:", err.message);
    }
};

const checkLocal = async () => {
    console.log("\n--- CHECK LOCAL ---");
    const localUri = "mongodb://localhost:27017";
    try {
        const conn = await mongoose.createConnection(localUri).asPromise();
        console.log("Connected to Local.");
        const admin = conn.db.admin();
        const dbs = await admin.listDatabases();
        console.log("Local Databases:", dbs.databases.map(d => d.name).join(', '));
        await conn.close();
    } catch (err) {
        console.log("Local connection failed:", err.message);
    }
};

(async () => {
    await checkRemote();
    await checkLocal();
})();
