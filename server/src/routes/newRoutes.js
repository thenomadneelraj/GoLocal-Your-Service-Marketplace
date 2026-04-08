const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Import new consolidated models
const UserNew = require('../models/UserNew');
const ServiceNew = require('../models/ServiceNew');
const BookingNew = require('../models/BookingNew');
const ConversationNew = require('../models/ConversationNew');
const MessageNew = require('../models/MessageNew');
const TransactionNew = require('../models/TransactionNew');
const DisputeNew = require('../models/DisputeNew');
const NotificationNew = require('../models/NotificationNew');

// Middleware to protect routes
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await UserNew.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('address').optional().isLength({ min: 5 }).withMessage('Address must be at least 5 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, address, bio } = req.body;
    
    const updatedUser = await UserNew.findByIdAndUpdate(
      req.user._id,
      { name, phone, address, bio },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get services for current provider
router.get('/services', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can access their services' });
    }

    const services = await ServiceNew.find({ providerId: req.user._id });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new service
router.post('/services', auth, [
  body('name').notEmpty().withMessage('Service name is required'),
  body('description').notEmpty().withMessage('Service description is required'),
  body('category').isIn(['Plumbing', 'Electrical', 'Cleaning', 'Painting', 'Carpentry', 'AC Repair', 'Appliance Repair', 'Moving', 'Other']).withMessage('Invalid category'),
  body('price').isNumeric().withMessage('Price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can create services' });
    }

    const { name, description, category, price } = req.body;
    
    const service = new ServiceNew({
      providerId: req.user._id,
      name,
      description,
      category,
      price,
      availability: true
    });

    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get bookings for current user
router.get('/bookings', auth, async (req, res) => {
  try {
    let bookings;
    
    if (req.user.role === 'client') {
      bookings = await BookingNew.find({ clientId: req.user._id })
        .populate('providerId', 'name email')
        .populate('serviceId', 'name price');
    } else if (req.user.role === 'provider') {
      bookings = await BookingNew.find({ providerId: req.user._id })
        .populate('clientId', 'name email')
        .populate('serviceId', 'name price');
    } else {
      return res.status(403).json({ message: 'Invalid role' });
    }

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new booking
router.post('/bookings', auth, [
  body('serviceId').notEmpty().withMessage('Service ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('address').notEmpty().withMessage('Address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can create bookings' });
    }

    const { serviceId, date, address, notes } = req.body;
    
    // Check if service exists and is available
    const service = await ServiceNew.findById(serviceId);
    if (!service || !service.availability) {
      return res.status(404).json({ message: 'Service not available' });
    }

    const booking = new BookingNew({
      clientId: req.user._id,
      providerId: service.providerId,
      serviceId,
      date: new Date(date),
      address,
      notes: notes || '',
      status: 'pending'
    });

    await booking.save();
    
    // Create notification for provider
    await NotificationNew.create({
      userId: service.providerId,
      message: `New booking request from ${req.user.name}`,
      type: 'booking',
      actionUrl: `/bookings/${booking._id}`,
      actionText: 'View Booking'
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update booking status
router.put('/bookings/:id/status', auth, [
  body('status').isIn(['pending', 'accepted', 'completed', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const bookingId = req.params.id;
    
    const booking = await BookingNew.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check permissions
    if (req.user.role === 'client' && booking.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (req.user.role === 'provider' && booking.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    booking.status = status;
    await booking.save();

    // Create notification
    const notificationUserId = req.user.role === 'client' ? booking.providerId : booking.clientId;
    await NotificationNew.create({
      userId: notificationUserId,
      message: `Booking status updated to ${status}`,
      type: 'booking',
      actionUrl: `/bookings/${booking._id}`,
      actionText: 'View Booking'
    });

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get conversations for current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await ConversationNew.find({
      participants: req.user._id
    })
    .populate('participants', 'name email')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conversationId = req.params.id;
    
    // Check if user is part of this conversation
    const conversation = await ConversationNew.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await MessageNew.find({ conversationId })
      .populate('senderId', 'name')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/conversations/:id/messages', auth, [
  body('message').notEmpty().withMessage('Message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const conversationId = req.params.id;
    const { message } = req.body;
    
    // Check if user is part of this conversation
    const conversation = await ConversationNew.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newMessage = new MessageNew({
      conversationId,
      senderId: req.user._id,
      message,
      isRead: false
    });

    await newMessage.save();

    // Update conversation with last message
    await ConversationNew.findByIdAndUpdate(conversationId, {
      lastMessage: newMessage._id,
      lastMessageAt: new Date()
    });

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transactions for current user
router.get('/transactions', auth, async (req, res) => {
  try {
    let transactions;
    
    if (req.user.role === 'client') {
      transactions = await TransactionNew.find({ clientId: req.user._id })
        .populate('providerId', 'name')
        .populate('bookingId', 'date status');
    } else if (req.user.role === 'provider') {
      transactions = await TransactionNew.find({ providerId: req.user._id })
        .populate('clientId', 'name')
        .populate('bookingId', 'date status');
    } else {
      return res.status(403).json({ message: 'Invalid role' });
    }

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notifications for current user
router.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await NotificationNew.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    const notification = await NotificationNew.findById(notificationId);
    if (!notification || notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard data for client
router.get('/client/dashboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [
      bookings,
      transactions,
      notifications,
      services
    ] = await Promise.all([
      BookingNew.find({ clientId: req.user._id }).populate('providerId serviceId'),
      TransactionNew.find({ clientId: req.user._id }),
      NotificationNew.find({ userId: req.user._id, isRead: false }),
      ServiceNew.find({ availability: true }).populate('providerId', 'name')
    ]);

    // Calculate summary
    const summary = {
      activeProviders: new Set(bookings.map(b => b.providerId._id.toString())).size,
      ongoingProjects: bookings.filter(b => b.status === 'accepted').length,
      totalSpent: transactions.reduce((sum, t) => sum + t.amount, 0),
      upcomingMeetings: bookings.filter(b => 
        b.status === 'accepted' && 
        new Date(b.date) > new Date()
      ).length
    };

    res.json({
      summary,
      bookings,
      transactions,
      notifications,
      services
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard data for provider
router.get('/provider/dashboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [
      bookings,
      transactions,
      notifications,
      services
    ] = await Promise.all([
      BookingNew.find({ providerId: req.user._id }).populate('clientId serviceId'),
      TransactionNew.find({ providerId: req.user._id }),
      NotificationNew.find({ userId: req.user._id, isRead: false }),
      ServiceNew.find({ providerId: req.user._id })
    ]);

    // Calculate summary
    const summary = {
      totalBookings: bookings.length,
      pendingBookings: bookings.filter(b => b.status === 'pending').length,
      totalEarnings: transactions.reduce((sum, t) => sum + t.amount, 0),
      activeServices: services.filter(s => s.availability).length
    };

    res.json({
      summary,
      bookings,
      transactions,
      notifications,
      services
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
