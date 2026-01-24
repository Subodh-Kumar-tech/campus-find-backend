const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

const EMAIL = "geck2@gmail.com";
const PASS = "geck@123";

const checkSpecificDB = async (dbName) => {
    let uri = process.env.MONGO_URI;
    uri = uri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);

    const result = { db: dbName, foundUser: false, passwordMatch: false, items: [] };

    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        const db = conn.db;

        const user = await db.collection('users').findOne({ email: EMAIL });
        if (user) {
            result.foundUser = true;
            result.userId = user._id;
            if (user.password) {
                result.passwordMatch = await bcrypt.compare(PASS, user.password);
            }
        }

        const items = await db.collection('items').find({}).toArray();
        result.items = items.map(i => ({ title: i.title, category: i.category }));

        await conn.close();
    } catch (err) {
        result.error = err.message;
    }
    return result;
};

(async () => {
    const report1 = await checkSpecificDB('test');
    const report2 = await checkSpecificDB('lostfound');
    fs.writeFileSync('final_report.json', JSON.stringify({ test: report1, lostfound: report2 }, null, 2));
    process.exit(0);
})();
