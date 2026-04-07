const express = require("express");
const cors = require("cors");

// Import routes
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const providerRoutes = require("./routes/provider");
const bookingRoutes = require("./routes/booking");
const clientRoutes = require("./routes/client");
const contactMessageRoutes = require("./routes/contactMessage");
const disputeRoutes = require("./routes/dispute");
const messageRoutes = require("./routes/message");
const notificationRoutes = require("./routes/notification");
const transactionRoutes = require("./routes/transaction");

const app = express();

// Middleware

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Root Route
app.get("/", (req, res) => {
    res.send("🚀 GoLocal Backend API is running");
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Admin Route
app.use('/api/admin', adminRoutes);

// Provider routes (IMPORTANT)
app.use("/api/providers", providerRoutes);

// Booking routes
app.use("/api/bookings", bookingRoutes);

// Client routes
app.use("/api/clients", clientRoutes);

// Public contact-message route
app.use("/api/contact-messages", contactMessageRoutes);

// Client dispute routes
app.use("/api/disputes", disputeRoutes);

// Message routes
app.use("/api/messages", messageRoutes);

// Notification routes
app.use("/api/notifications", notificationRoutes);

// Transaction routes
app.use("/api/transactions", transactionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development'
            ? err.message
            : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

module.exports = app;
