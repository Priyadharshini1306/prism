console.log('--- PRISM STARTING ---'); // Force Reload

// Fix: Override DNS to use Google DNS so MongoDB Atlas SRV records resolve
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const routes = require('./src/routes/index');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Connect to Database ───────────────────────────────────────────────────
connectDB();

// Auto-seeder disabled — videos are managed by users

// ─── Security Middleware ───────────────────────────────────────────────────

// Helmet: Sets 15+ security-related HTTP headers automatically
app.use(helmet());

// CORS: Allows only your frontend to call this API
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true, // Allow cookies (needed for refresh tokens later)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiter: Max 300 requests per 15 minutes per IP (skip large uploads)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for file upload endpoints
    return req.path === '/auth/profile/upload' || req.path === '/videos/upload';
  },
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
});
app.use('/api', limiter);


// ─── General Middleware ────────────────────────────────────────────────────

// Compression: Gzip all responses — reduces payload size ~70%
app.use(compression());

// HTTP Logger
app.use(logger);

// Cookie Parser
app.use(cookieParser());

// Body Parsers: Allow Express to read JSON and URL-encoded bodies
app.use(express.json({ limit: '10mb' })); // Limit body size for security
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Files (thumbnails & uploads) ─────────────────────────────────
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// 404 Handler — for any unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler (must be last) ──────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────
const http = require('http');
const { initSocket } = require('./src/config/socket');

const server = http.createServer(app);

// Initialize Sockets
initSocket(server);

const serverInstance = server.listen(PORT, () => {
  console.log(`
🚀 PRISM Backend running
🌐 URL:         http://localhost:${PORT}
📡 API Base:    http://localhost:${PORT}/api
🏥 Health:      http://localhost:${PORT}/api/health
🌍 Environment: ${process.env.NODE_ENV}
  `);
});

// Graceful shutdown — don't drop active connections abruptly
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  serverInstance.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app; // Export for testing