import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function setAdmin() {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await mongoose.connection.db.collection('users').updateOne(
        { email: 'protham.dey@gmail.com' },
        { $set: { role: 'admin' } }
    );
    console.log('Matched:', result.matchedCount, 'Modified:', result.modifiedCount);
    process.exit(0);
}

setAdmin().catch(err => { console.error(err); process.exit(1); });
