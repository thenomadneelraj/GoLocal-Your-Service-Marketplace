const express = require("express");
const cors = require("cors");

// Import routes
const authRoutes = require('./routes/auth');
const providerRoutes = require("./routes/provider");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root Route
app.get("/", (req, res) => {
    res.send("🚀 GoLocal Backend API is running");
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Provider routes (IMPORTANT)
app.use('/api/providers', providerRoutes);

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
app.use( (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

module.exports = app;
