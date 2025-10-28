/**
 * 🚀 STREET CONTROL - BACKEND SERVER
 * 
 * Server Express per gestione gare Streetlifting
 * 
 * Stack:
 * - Express (Web framework)
 * - Supabase (Database + Auth + Realtime)
 * - WebSocket (Eventi custom real-time)
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

// Import routes
import authRoutes from './routes/auth.js'

// Carica variabili ambiente
dotenv.config()

// ============================================
// CONFIGURAZIONE EXPRESS
// ============================================

const app = express()
const PORT = process.env.PORT || 5000

// ============================================
// MIDDLEWARE GLOBALI
// ============================================

// 1. Security headers
app.use(helmet())

// 2. CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
app.use(cors({
  origin: (origin, callback) => {
    // Permetti richieste senza origin (es. Postman, mobile)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

// 3. Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 4. HTTP logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// 5. Rate limiting (solo in produzione)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minuti
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Troppe richieste da questo IP, riprova più tardi'
  })
  app.use('/api/', limiter)
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Street Control API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

// ============================================
// API ROUTES
// ============================================

// Auth routes
app.use('/api/auth', authRoutes)

// TODO: Altre routes da implementare nelle prossime fasi
// app.use('/api/meets', meetRoutes)
// app.use('/api/athletes', athleteRoutes)
// app.use('/api/votes', voteRoutes)
// app.use('/api/director', directorRoutes)

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint non trovato',
    path: req.path
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err)
  
  res.status(err.status || 500).json({
    error: err.message || 'Errore interno del server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('🚀 ============================================')
  console.log(`🏋️  Street Control Backend`)
  console.log(`📡 Server running on port ${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`)
  console.log('🚀 ============================================')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully...')
  process.exit(0)
})

export default app
