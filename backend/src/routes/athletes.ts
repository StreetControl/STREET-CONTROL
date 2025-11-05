/**
 * ATHLETES ROUTES
 * Routes for athlete management
 */

import express from 'express';
import { 
  getAthletes,
  createAthlete, 
  bulkCreateAthletes,
  updateAthlete,
  deleteAthleteFromMeet
} from '../controllers/athletesController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/meets/:meetId/athletes
 * Get all athletes registered for a specific meet
 */
router.get('/meets/:meetId/athletes', getAthletes);

/**
 * POST /api/meets/:meetId/athletes
 * Register a single athlete for a meet
 */
router.post('/meets/:meetId/athletes', createAthlete);

/**
 * POST /api/meets/:meetId/athletes/bulk
 * Bulk import athletes from CSV
 */
router.post('/meets/:meetId/athletes/bulk', bulkCreateAthletes);

/**
 * PATCH /api/athletes/:athleteId
 * Update athlete information
 */
router.patch('/athletes/:athleteId', updateAthlete);

/**
 * DELETE /api/meets/:meetId/athletes/:athleteId
 * Remove an athlete from a meet
 */
router.delete('/meets/:meetId/athletes/:athleteId', deleteAthleteFromMeet);

export default router;
