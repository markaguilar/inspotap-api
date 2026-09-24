// app.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');

const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');

// ─────────────────────────────────────────────────────────────────────────────
// App + HTTP server
// Must use createServer(app) so Socket.io and Express share the same port
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app); // ← wrap Express in an HTTP server

// ─────────────────────────────────────────────────────────────────────────────
// Socket.io setup
// ─────────────────────────────────────────────────────────────────────────────

const allowedOrigins = ['http://localhost:3000', config.frontendUrl].filter(Boolean); // remove undefined if frontendUrl is not set

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  // eslint-disable-next-line no-console
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    // eslint-disable-next-line no-console
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Morgan logging
// ─────────────────────────────────────────────────────────────────────────────

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// ─────────────────────────────────────────────────────────────────────────────
// CORS — same origins used by both Express and Socket.io
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: allowedOrigins,
    /* function(origin, callback) {
      // Allow requests with no origin (e.g., curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }, */
    credentials: true, // Allow cookies/auth headers
  })
);
app.options('*', cors());

// ─────────────────────────────────────────────────────────────────────────────
// Core middleware
// ─────────────────────────────────────────────────────────────────────────────

app.use(cookieParser());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xss());
app.use(mongoSanitize());
app.use(compression());

// ─────────────────────────────────────────────────────────────────────────────
// Passport JWT
// ─────────────────────────────────────────────────────────────────────────────

app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting — auth endpoints only in production
// ─────────────────────────────────────────────────────────────────────────────

if (config.env === 'production') {
  app.use('/api/v1/auth', authLimiter);
}

// ─────────────────────────────────────────────────────────────────────────────
// API routes
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/v1', routes);

// ─────────────────────────────────────────────────────────────────────────────
// 404 + error handlers
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

app.use(errorConverter);
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Export BOTH — server.js uses httpServer to listen, tests use app
// ─────────────────────────────────────────────────────────────────────────────

module.exports = { app, httpServer };
