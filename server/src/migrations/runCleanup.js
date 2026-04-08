const mongoose = require('mongoose');
require('dotenv').config();

const cleanupDatabase = require('./cleanupDatabase');

async function runCleanup() {
  try {
    console.log('Starting database cleanup process...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/go-local');
    console.log('Connected to MongoDB');
    
    // Run cleanup
    await cleanupDatabase();
    
    console.log('Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('Database cleanup failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the cleanup
runCleanup();
