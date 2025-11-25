/**
 * STREET CONTROL - BACKEND SERVER
 */

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import meetsRoutes from './routes/meets.js';
import athletesRoutes from './routes/athletes.js';
import divisionRoutes from './routes/division.js';
import weighInRoutes from './routes/weighIn.js';
import directorRoutes from './routes/director.js';

// Load environment variables
dotenv.config();

// ============================================
// EXPRESS CONFIGURATION
// ============================================

const app: Application = express();
const PORT = process.env.PORT || 5000;

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// 1. Security headers
app.use(helmet());

// 2. CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without origin (e.g., Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// 3. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. HTTP logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 5. Rate limiting (production only)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later'
  });
  app.use('/api/', limiter);
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Street Control API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ============================================
// API ROUTES
// ============================================

// Auth routes
app.use('/api/auth', authRoutes);

// Meets routes
app.use('/api/meets', meetsRoutes);

// Athletes routes (nested under meets)
app.use('/api', athletesRoutes);

// Division routes (nested under meets)
app.use('/api/meets', divisionRoutes);

// Weigh-in routes (nested under meets)
app.use('/api/meets', weighInRoutes);
app.use('/api', weighInRoutes);

// Director routes
app.use('/api/director', directorRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint '${req.method} ${req.path}' does not exist`,
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Global error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// START SERVER
// ============================================

const server = app.listen(PORT, () => {
  console.log('============================================');
  console.log(`🏋️  Street Control Backend`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log('============================================');
});

// Increase timeout for bulk operations (120 seconds)
server.timeout = 120000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
