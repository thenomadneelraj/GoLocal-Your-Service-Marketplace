/**
 * Mock Data Seed Generator
 * Generates realistic initial data for the mock database
 */

import mockDB from './db.js';

// Mock data constants
const FIRST_NAMES = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Mary', 'William', 'Patricia', 'Richard', 'Jennifer', 'Charles', 'Linda', 'Joseph', 'Barbara', 'Thomas', 'Susan'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte'];
const STATES = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'FL', 'OH', 'NC', 'GA'];

const SERVICE_TYPES = [
  'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Landscaping', 
  'HVAC', 'Roofing', 'Moving', 'Appliance Repair', 'Pest Control', 'Home Security',
  'Flooring', 'Window Installation', 'Insulation', 'Concrete', 'Pool Maintenance', 'Tree Service'
];

const SERVICE_DESCRIPTIONS = [
  'Professional and reliable service with years of experience',
  'High-quality workmanship guaranteed, licensed and insured',
  'Fast response time, competitive pricing',
  'Expert solutions for all your needs',
  'Trusted local provider with excellent reviews',
  'Specializing in residential and commercial projects',
  'Eco-friendly and sustainable solutions available',
  'Emergency services available 24/7'
];

const BOOKING_STATUSES = ['pending', 'accepted', 'completed', 'cancelled'];
const DISPUTE_REASONS = ['Poor quality', 'Late arrival', 'Damage to property', 'Incomplete work', 'Billing issue', 'Unprofessional behavior'];

// Utility functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNumber(1, 99)}@${randomChoice(domains)}`;
}

function randomPhone() {
  return `(${randomNumber(200, 999)}) ${randomNumber(100, 999)}-${randomNumber(1000, 9999)}`;
}

function randomAddress() {
  const streetNumber = randomNumber(100, 9999);
  const streetNames = ['Main St', 'Oak Ave', 'Elm St', 'Pine St', 'Maple Ave', 'Cedar St', 'Washington St', 'Park Ave', 'Lincoln St', 'Union St'];
  return `${streetNumber} ${randomChoice(streetNames)}, ${randomChoice(CITIES)}, ${randomChoice(STATES)}`;
}

function randomBio(profession) {
  const bios = [
    `Experienced ${profession} with over ${randomNumber(3, 15)} years in the industry`,
    `Certified ${profession} specializing in residential and commercial projects`,
    `Professional ${profession} committed to quality and customer satisfaction`,
    `Reliable ${profession} with excellent track record and positive reviews`,
    `Skilled ${profession} offering competitive rates and flexible scheduling`
  ];
  return randomChoice(bios);
}

// Data generators
function generateUsers() {
  const users = [];
  
  // Admin user
  users.push({
    name: 'Admin User',
    email: 'admin@golocal.com',
    role: 'admin',
    avatar: `https://ui-avatars.com/api/?name=Admin+User&background=0d47a1&color=fff`,
    phone: randomPhone(),
    address: randomAddress(),
    approvalStatus: 'approved',
    isVerified: true,
    isActive: true
  });

  // Generate providers
  for (let i = 0; i < 15; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);
    const serviceType = randomChoice(SERVICE_TYPES);
    
    users.push({
      name: `${firstName} ${lastName}`,
      email: randomEmail(firstName, lastName),
      role: 'provider',
      avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=4caf50&color=fff`,
      phone: randomPhone(),
      address: randomAddress(),
      serviceType,
      bio: randomBio(serviceType),
      rating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0 to 5.0
      totalReviews: randomNumber(0, 50),
      experience: randomNumber(1, 20),
      hourlyRate: randomNumber(25, 150),
      approvalStatus: randomChoice(['approved', 'pending', 'rejected']),
      isVerified: Math.random() > 0.3,
      isActive: Math.random() > 0.1,
      skills: [serviceType, randomChoice(SERVICE_TYPES)]
    });
  }

  // Generate clients
  for (let i = 0; i < 25; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);
    
    users.push({
      name: `${firstName} ${lastName}`,
      email: randomEmail(firstName, lastName),
      role: 'client',
      avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=2196f3&color=fff`,
      phone: randomPhone(),
      address: randomAddress(),
      isVerified: Math.random() > 0.5,
      isActive: true
    });
  }

  return users;
}

function generateServices(providers) {
  const services = [];
  
  providers.forEach(provider => {
    const serviceCount = randomNumber(1, 4);
    
    for (let i = 0; i < serviceCount; i++) {
      services.push({
        providerId: provider._id,
        providerName: provider.name,
        title: `${provider.serviceType} Service ${i + 1}`,
        description: randomChoice(SERVICE_DESCRIPTIONS),
        price: randomNumber(50, 500),
        duration: `${randomNumber(1, 8)} hours`,
        category: provider.serviceType,
        isActive: Math.random() > 0.1
      });
    }
  });

  return services;
}

function generateBookings(clients, providers, services) {
  const bookings = [];
  
  clients.forEach(client => {
    const bookingCount = randomNumber(1, 5);
    
    for (let i = 0; i < bookingCount; i++) {
      const provider = randomChoice(providers.filter(p => p.approvalStatus === 'approved'));
      const service = randomChoice(services.filter(s => s.providerId === provider._id && s.isActive));
      
      if (service) {
        const createdAt = new Date(Date.now() - randomNumber(1, 90) * 24 * 60 * 60 * 1000).toISOString();
        
        bookings.push({
          clientId: client._id,
          providerId: provider._id,
          serviceId: service._id,
          status: randomChoice(BOOKING_STATUSES),
          price: service.price,
          notes: `Booking request for ${service.title}`,
          createdAt,
          updatedAt: createdAt,
          scheduledDate: new Date(Date.parse(createdAt) + randomNumber(1, 30) * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }
  });

  return bookings;
}

function generateMessages(bookings, users) {
  const messages = [];
  
  bookings.forEach(booking => {
    const messageCount = randomNumber(3, 10);
    
    for (let i = 0; i < messageCount; i++) {
      const participants = [booking.clientId, booking.providerId];
      const senderId = randomChoice(participants);
      const sender = users.find(u => u._id === senderId);
      
      const clientMessages = [
        'Hi, I need this service as soon as possible',
        'Are you available this weekend?',
        'What\'s your availability for next week?',
        'Can you provide a quote for this service?',
        'I have a few questions about the service',
        'Thank you for your quick response',
        'Looking forward to working with you',
        'Is there anything I need to prepare before the service?'
      ];
      
      const providerMessages = [
        'Hello! I\'d be happy to help you with this service',
        'Yes, I\'m available this weekend',
        'I can schedule you for next week',
        'My rates are competitive and flexible',
        'I have over 10 years of experience in this field',
        'Thank you for choosing my service',
        'I\'ll bring all necessary equipment',
        'The service usually takes about 2-3 hours'
      ];
      
      const messageText = sender.role === 'client' ? randomChoice(clientMessages) : randomChoice(providerMessages);
      const createdAt = new Date(Date.parse(booking.createdAt) + i * randomNumber(1, 24) * 60 * 60 * 1000).toISOString();
      
      messages.push({
        bookingId: booking._id,
        senderId,
        senderName: sender.name,
        senderRole: sender.role,
        text: messageText,
        createdAt,
        read: Math.random() > 0.3
      });
    }
  });

  return messages;
}

function generateDisputes(bookings, users) {
  const disputes = [];
  
  // Create disputes for about 20% of bookings
  const disputedBookings = bookings.filter(() => Math.random() < 0.2);
  
  disputedBookings.forEach(booking => {
    const dispute = {
      bookingId: booking._id,
      raisedBy: booking.clientId, // Usually raised by client
      reason: randomChoice(DISPUTE_REASONS),
      description: `Issue with ${booking.serviceId} booking`,
      status: randomChoice(['open', 'resolved', 'investigating']),
      createdAt: new Date(Date.parse(booking.createdAt) + randomNumber(1, 7) * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    disputes.push(dispute);
  });

  return disputes;
}

// Main seed function
export function seedDatabase() {
  console.log('🌱 Seeding mock database...');
  
  // Clear existing data
  mockDB.clear();
  
  // Generate users
  const users = generateUsers();
  users.forEach(user => mockDB.insert('users', user));
  console.log(`✅ Generated ${users.length} users`);
  
  // Generate services
  const providers = mockDB.getProviders();
  const services = generateServices(providers);
  services.forEach(service => mockDB.insert('services', service));
  console.log(`✅ Generated ${services.length} services`);
  
  // Generate bookings
  const clients = mockDB.getClients();
  const bookings = generateBookings(clients, providers, services);
  bookings.forEach(booking => mockDB.insert('bookings', booking));
  console.log(`✅ Generated ${bookings.length} bookings`);
  
  // Generate messages
  const allUsers = mockDB.getUsers();
  const messages = generateMessages(bookings, allUsers);
  messages.forEach(message => mockDB.insert('messages', message));
  console.log(`✅ Generated ${messages.length} messages`);
  
  // Generate disputes
  const disputes = generateDisputes(bookings, allUsers);
  disputes.forEach(dispute => mockDB.insert('disputes', dispute));
  console.log(`✅ Generated ${disputes.length} disputes`);
  
  console.log('🎉 Mock database seeded successfully!');
  
  return {
    users: users.length,
    services: services.length,
    bookings: bookings.length,
    messages: messages.length,
    disputes: disputes.length
  };
}

// Auto-seed if database is empty
export function autoSeed() {
  const users = mockDB.getUsers();
  if (users.length === 0) {
    seedDatabase();
  }
}

export default { seedDatabase, autoSeed };
