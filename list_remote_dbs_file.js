const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const listRemoteDBs = async () => {
    const uri = process.env.MONGO_URI;
    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        const admin = conn.db.admin();
        const result = await admin.listDatabases();

        const dbNames = result.databases.map(db => db.name).join('\n');
        fs.writeFileSync('remote_dbs.txt', dbNames);

        await conn.close();
    } catch (err) {
        fs.writeFileSync('remote_dbs.txt', "Error: " + err.message);
    }
};

listRemoteDBs();
