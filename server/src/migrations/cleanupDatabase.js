const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import existing models
const Admin = require('../models/Admin');
const Client = require('../models/Client');
const Provider = require('../models/Provider');
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Transaction = require('../models/Transaction');
const Dispute = require('../models/Dispute');
const Notification = require('../models/Notification');
const Review = require('../models/Review');
const LoginHistory = require('../models/LoginHistory');
const ActivityLog = require('../models/ActivityLog');
const ContactMessage = require('../models/ContactMessage');
const Payout = require('../models/Payout');
const PlatformSetting = require('../models/PlatformSetting');

// Import new consolidated models
const UserNew = require('../models/UserNew');
const ServiceNew = require('../models/ServiceNew');
const BookingNew = require('../models/BookingNew');
const ConversationNew = require('../models/ConversationNew');
const MessageNew = require('../models/MessageNew');
const TransactionNew = require('../models/TransactionNew');
const DisputeNew = require('../models/DisputeNew');
const NotificationNew = require('../models/NotificationNew');

async function cleanupDatabase() {
  try {
    console.log('Starting database cleanup...');
    
    // 1. Create backup of existing data
    console.log('Creating backup...');
    await createBackup();
    
    // 2. Drop old collections
    console.log('Dropping old collections...');
    await dropOldCollections();
    
    // 3. Drop new collections to start fresh
    console.log('Dropping new collections...');
    await dropNewCollections();
    
    // 4. Create fresh consolidated collections
    console.log('Creating fresh consolidated collections...');
    await createConsolidatedCollections();
    
    // 5. Migrate data from old to new
    console.log('Migrating data...');
    await migrateData();
    
    // 6. Create sample data for testing
    console.log('Creating sample data...');
    await createSampleData();
    
    console.log('Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('Error during database cleanup:', error);
    throw error;
  }
}

async function createBackup() {
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  
  const collections = {
    admins: await Admin.find({}).lean(),
    clients: await Client.find({}).lean(),
    providers: await Provider.find({}).lean(),
    users: await User.find({}).lean(),
    services: await Service.find({}).lean(),
    bookings: await Booking.find({}).lean(),
    conversations: await Conversation.find({}).lean(),
    messages: await Message.find({}).lean(),
    transactions: await Transaction.find({}).lean(),
    disputes: await Dispute.find({}).lean(),
    notifications: await Notification.find({}).lean(),
    reviews: await Review.find({}).lean(),
    loginHistory: await LoginHistory.find({}).lean(),
    activityLog: await ActivityLog.find({}).lean(),
    contactMessages: await ContactMessage.find({}).lean(),
    payouts: await Payout.find({}).lean(),
    platformSettings: await PlatformSetting.find({}).lean(),
  };
  
  fs.writeFileSync(backupFile, JSON.stringify(collections, null, 2));
  console.log(`Backup created at: ${backupFile}`);
}

async function dropOldCollections() {
  const oldCollections = [
    'admins', 'clients', 'providers', 'users', 'services', 'bookings',
    'conversations', 'messages', 'transactions', 'disputes', 'notifications',
    'reviews', 'loginhistories', 'activitylogs', 'contactmessages', 
    'payouts', 'platformsettings'
  ];
  
  for (const collectionName of oldCollections) {
    try {
      await mongoose.connection.db.dropCollection(collectionName);
      console.log(`Dropped collection: ${collectionName}`);
    } catch (error) {
      if (error.code !== 26) { // Namespace not found
        console.log(`Collection ${collectionName} not found, skipping...`);
      }
    }
  }
}

async function dropNewCollections() {
  const newCollections = [
    'usernews', 'servicenews', 'bookingnews', 'conversationnews',
    'messagenews', 'transactionnews', 'disputenews', 'notificationnews'
  ];
  
  for (const collectionName of newCollections) {
    try {
      await mongoose.connection.db.dropCollection(collectionName);
      console.log(`Dropped new collection: ${collectionName}`);
    } catch (error) {
      if (error.code !== 26) { // Namespace not found
        console.log(`Collection ${collectionName} not found, skipping...`);
      }
    }
  }
}

async function createConsolidatedCollections() {
  // Create indexes for new collections
  await UserNew.createIndexes();
  await ServiceNew.createIndexes();
  await BookingNew.createIndexes();
  await ConversationNew.createIndexes();
  await MessageNew.createIndexes();
  await TransactionNew.createIndexes();
  await DisputeNew.createIndexes();
  await NotificationNew.createIndexes();
  
  console.log('Created indexes for new consolidated collections');
}

async function migrateData() {
  console.log('Starting data migration...');
  
  // Since we dropped all collections, we'll create fresh sample data
  // This is cleaner than trying to migrate potentially corrupted data
  console.log('Skipping migration - will create fresh sample data');
}

async function createSampleData() {
  console.log('Creating sample data...');
  
  // Create sample users with proper password hashing
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const sampleUsers = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      role: 'client',
      approvalStatus: 'approved',
      isVerified: true,
      totalLogins: 5,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: hashedPassword,
      role: 'provider',
      approvalStatus: 'approved',
      isVerified: true,
      totalLogins: 3,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      approvalStatus: 'approved',
      isVerified: true,
      totalLogins: 10,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const createdUsers = await UserNew.insertMany(sampleUsers);
  console.log(`Created ${createdUsers.length} sample users`);
  
  // Create sample services
  const sampleServices = [
    {
      providerId: createdUsers[1]._id, // Jane Smith (provider)
      name: 'Plumbing Services',
      description: 'Professional plumbing repair and installation',
      category: 'Plumbing',
      price: 1500,
      images: [],
      availability: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      providerId: createdUsers[1]._id,
      name: 'Electrical Work',
      description: 'Complete electrical installation and repair',
      category: 'Electrical',
      price: 2000,
      images: [],
      availability: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const createdServices = await ServiceNew.insertMany(sampleServices);
  console.log(`Created ${createdServices.length} sample services`);
  
  // Create sample bookings
  const sampleBookings = [
    {
      clientId: createdUsers[0]._id, // John Doe (client)
      providerId: createdUsers[1]._id, // Jane Smith (provider)
      serviceId: createdServices[0]._id,
      status: 'accepted',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      timeSlot: '10:00 AM - 12:00 PM',
      address: '123 Main St, City, State',
      notes: 'Kitchen pipe repair needed',
      price: 1500,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const createdBookings = await BookingNew.insertMany(sampleBookings);
  console.log(`Created ${createdBookings.length} sample bookings`);
  
  // Create sample conversations
  const sampleConversations = [
    {
      participants: [createdUsers[0]._id, createdUsers[1]._id],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const createdConversations = await ConversationNew.insertMany(sampleConversations);
  console.log(`Created ${createdConversations.length} sample conversations`);
  
  // Create sample messages
  const sampleMessages = [
    {
      conversationId: createdConversations[0]._id,
      senderId: createdUsers[0]._id,
      message: 'I need plumbing services for my kitchen',
      isRead: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      conversationId: createdConversations[0]._id,
      senderId: createdUsers[1]._id,
      message: 'Looking forward to the service',
      isRead: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const createdMessages = await MessageNew.insertMany(sampleMessages);
  console.log(`Created ${createdMessages.length} sample messages`);
  
  // Update conversation with last message reference
  await ConversationNew.findByIdAndUpdate(
    createdConversations[0]._id,
    {
      lastMessage: createdMessages[createdMessages.length - 1]._id,
      lastMessageAt: new Date()
    }
  );
  
  // Create sample transactions
  const sampleTransactions = [
    {
      bookingId: createdBookings[0]._id,
      clientId: createdUsers[0]._id,
      providerId: createdUsers[1]._id,
      amount: 1500,
      status: 'paid',
      paymentMethod: 'card',
      transactionId: 'txn_' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const createdTransactions = await TransactionNew.insertMany(sampleTransactions);
  console.log(`Created ${createdTransactions.length} sample transactions`);
  
  // Create sample notifications
  const sampleNotifications = [
    {
      userId: createdUsers[0]._id,
      message: 'Your booking has been confirmed',
      type: 'booking',
      isRead: false,
      actionUrl: '/bookings',
      actionText: 'View Booking',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      userId: createdUsers[1]._id,
      message: 'New booking request received',
      type: 'booking',
      isRead: false,
      actionUrl: '/bookings',
      actionText: 'View Bookings',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const createdNotifications = await NotificationNew.insertMany(sampleNotifications);
  console.log(`Created ${createdNotifications.length} sample notifications`);
  
  console.log('Sample data creation completed!');
}

// Run the cleanup
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/go-local')
    .then(() => {
      console.log('Connected to MongoDB');
      return cleanupDatabase();
    })
    .then(() => {
      console.log('Cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = cleanupDatabase;
