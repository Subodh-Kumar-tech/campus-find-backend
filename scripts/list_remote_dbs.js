const mongoose = require('mongoose');
require('dotenv').config();

const listRemoteDBs = async () => {
    const uri = process.env.MONGO_URI;
    // Remove the database name from the URI to connect to the 'admin' or root level if possible, 
    // though usually Atlas URIs let you list DBs regardless if you have permissions.
    // The current URI is .../lostfound?ret...

    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        console.log("Connected to Remote Cluster.");

        const admin = conn.db.admin();
        const result = await admin.listDatabases();
        console.log("Remote Databases found:");
        result.databases.forEach(db => {
            console.log(` - ${db.name} (size: ${db.sizeOnDisk})`);
        });

        await conn.close();
    } catch (err) {
        console.log("Remote connection failed:", err.message);
    }
};

listRemoteDBs();
