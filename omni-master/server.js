const express = require('express');
const dns = require('dns');
// Prefer IPv4 first to avoid EAI_AGAIN DNS resolution issues on some systems
try { dns.setDefaultResultOrder('ipv4first'); } catch (_) {}
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Import routes
const userRoutes = require('./routes/userRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const documentRoutes = require('./routes/documentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const characterRoutes = require('./routes/characterRoutes');
const imageRoutes = require('./routes/imageRoutes');
const avatarRoutes = require('./routes/avatarRoutes');
const videoRoutes = require('./routes/videoRoutes');
const phylloRoutes = require('./routes/phylloRoutes');
const { subscribe } = require('./utils/sseHub');
const { protect } = require('./middleware/auth');

// Import models to ensure they're loaded
require('./models/Image');
require('./models/Avatar');

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:3001", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "http://localhost:3001", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ['X-Image-Id', 'Content-Type', 'Content-Length']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Optional: trust proxy when tunneling (e.g., ngrok), to ensure correct client IP/rate-limit behavior
if (String(process.env.TRUST_PROXY || '').toLowerCase() === 'true') {
  try { app.set('trust proxy', 1); } catch (_) {}
}

// Optional lightweight request logger for debugging
if (String(process.env.DEBUG_HTTP || '').toLowerCase() === 'true') {
  app.use((req, res, next) => {
    try {
      console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
    } catch (_) {}
    next();
  });
}

// Static serving for uploaded files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting (can be disabled via env)
const limiter = process.env.DISABLE_RATE_LIMIT === 'true'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10000, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      skip: (req) => {
        // Skip rate limiting for image serving endpoints
        if (req.path.includes('/public/') || req.path.includes('/uploads/')) return true;
        // Skip status/polling endpoints used by front-end
        if (req.path.startsWith('/api/images/job/') || req.path.startsWith('/api/avatars/job/') || req.path.startsWith('/api/videos/job/')) return true;
        return false;
      }
    });

app.use(limiter);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/avatars', avatarRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/phyllo', phylloRoutes);

// SSE endpoint (authenticated)
app.get('/api/events', protect, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write(`event: ready\n`);
  res.write(`data: {"ok":true}\n\n`);
  subscribe(String(req.user._id), res);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      llm: 'checking...'
    }
  };

  // Test OpenRouter LLM
  try {
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      health.services.llm = 'no_api_key';
    } else {
      const testResponse = await fetch(openRouterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          // OpenRouter prefers standard Referer header from servers
          'Referer': 'http://localhost:3001',
          'X-Title': 'Omni Ai Health Check'
        },
        body: JSON.stringify({
          // Use a widely-available model to avoid 404 on health checks
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: 'Respond with exactly "OK" if you can process this request.'
            }
          ],
          max_tokens: 10
        }),
        timeout: 10000 // 10 second timeout
      });

      if (testResponse.ok) {
        const data = await testResponse.json();
        health.services.llm = 'working';
        health.services.llm_response = data.choices?.[0]?.message?.content || 'no_content';
      } else {
        // Read response text to expose upstream error details
        const errText = await testResponse.text();
        health.services.llm = `error_${testResponse.status}`;
        health.services.llm_error = errText;
      }
    }
  } catch (error) {
    health.services.llm = `error_${error.message}`;
  }

  res.status(200).json(health);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Database connection
const { connectDB } = require('./config/database');
const shouldSkipDb = process.env.SKIP_DB === 'true';

// Start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  if (!shouldSkipDb) {
    await connectDB();
  } else {
    console.log('SKIP_DB enabled: starting server without database connection');
  }
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

module.exports = app;
