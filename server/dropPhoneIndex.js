require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    
    // The collection is called 'users' usually in lower case, but mongoose model is 'User'
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    console.log("Attempting to drop phone_1 index...");
    await collection.dropIndex('phone_1');
    console.log("Successfully dropped phone_1 index!");
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log("Index phone_1 does not exist, nothing to drop.");
    } else {
      console.error("Error dropping index:", err);
    }
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

dropIndex();
