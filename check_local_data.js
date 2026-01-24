const mongoose = require('mongoose');

const checkLocalData = async () => {
    const localUri = "mongodb://localhost:27017";
    try {
        const conn = await mongoose.createConnection(localUri).asPromise();
        console.log("Connected to Local.");
        const admin = conn.db.admin();
        const dbsRes = await admin.listDatabases();
        const dbs = dbsRes.databases;

        console.log("Databases found:", dbs.map(d => d.name));

        for (const dbInfo of dbs) {
            const dbName = dbInfo.name;
            if (['admin', 'config', 'local'].includes(dbName)) continue;

            console.log(`\nChecking DB: ${dbName}`);
            const dbConn = conn.useDb(dbName);
            const collections = await dbConn.db.listCollections().toArray();

            for (const col of collections) {
                if (['users', 'items', 'members'].includes(col.name)) {
                    const count = await dbConn.db.collection(col.name).countDocuments();
                    console.log(`  - ${col.name}: ${count} documents`);
                }
            }
        }
        await conn.close();
    } catch (err) {
        console.log("Local connection failed:", err.message);
    }
};

checkLocalData();
