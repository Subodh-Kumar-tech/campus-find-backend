const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Assumes bcryptjs from your package.json
require('dotenv').config();

const EMAIL = "geck2@gmail.com";
const PASS = "geck@123";

const checkDB = async (dbName) => {
    let uri = process.env.MONGO_URI;
    // Current URI might be .../test?... or .../lostfound?...
    // We want to force it to dbName.
    // Regex replace the database name in the connection string
    // Standard format: mongodb+srv://<user>:<pass>@<cluster>/<dbname>?...
    uri = uri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);

    console.log(`\n-----------------------------------`);
    console.log(`CHECKING DATABASE: ${dbName}`);
    console.log(`-----------------------------------`);

    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        const db = conn.db;

        // 1. Check User
        const user = await db.collection('users').findOne({ email: EMAIL });
        if (!user) {
            console.log(`[USER] User '${EMAIL}' NOT FOUND in '${dbName}'`);
        } else {
            console.log(`[USER] Found user: ID=${user._id}, Name=${user.fullName}`);
            // Check password
            if (user.password) {
                const match = await bcrypt.compare(PASS, user.password);
                console.log(`[LOGIN] Password '${PASS}' match? ${match ? "YES ✅" : "NO ❌"}`);
            } else {
                console.log(`[LOGIN] User has no password field!?`);
            }
        }

        // 2. Check Items
        const items = await db.collection('items').find({}).toArray();
        console.log(`[ITEMS] Found ${items.length} items.`);
        items.forEach(i => {
            console.log(`  - [${i.category}] ${i.title} (ID: ${i._id})`);
        });

        await conn.close();

    } catch (err) {
        console.log(`ERROR connecting/checking ${dbName}:`, err.message);
    }
};

(async () => {
    // Check both potential remote databases
    await checkDB('test');
    await checkDB('lostfound');
    // Also check 'campusfind' just in case if users often used that name
    await checkDB('campusfind');
})();
