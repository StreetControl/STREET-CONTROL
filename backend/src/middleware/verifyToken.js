/**
 * VERIFY TOKEN MIDDLEWARE
 * 
 * Middleware to verify Supabase JWT token
 * Protects routes that require authentication
 * 
 * Uses LOCAL JWT validation
 */

import jwt from 'jsonwebtoken'

/**
 * Verifies Supabase JWT token validity LOCALLY
 * 
 * Extracts token from Authorization header: "Bearer <token>"
 * Verifies with jwt.verify() using SUPABASE_JWT_SECRET
 * If valid: populates req.user and passes to next()
 * If invalid: responds with 401 Unauthorized
 */
export async function verifyToken(req, res, next) {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing token. Please login.' 
      })
    }

    const token = authHeader.split(' ')[1]

    // 2. Verify token LOCALLY with JWT_SECRET
    if (!process.env.SUPABASE_JWT_SECRET) {
      throw new Error('SUPABASE_JWT_SECRET not configured in .env')
    }

    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET)

    // 3. Populate req.user with decoded token data
    req.user = {
      id: decoded.sub,              // Supabase auth.users.id
      email: decoded.email,
      role: decoded.role,
      user_metadata: decoded.user_metadata || {},
      app_metadata: decoded.app_metadata || {}
    }
    
    req.token = token

    // Debug log
    console.log(`Token verified (LOCAL): User ${decoded.email}`)

    // 4. Pass to controller
    next()

  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please login again.' 
      })
    }
    
    if (error.name === 'JsonWebTokenError') {
      console.error('JWT verification failed:', error.message)
      return res.status(401).json({ 
        error: 'Invalid token. Please login again.' 
      })
    }

    console.error('Verify token error:', error)
    res.status(500).json({ 
      error: 'Internal error during token verification' 
    })
  }
}

export default {
  verifyToken
}
