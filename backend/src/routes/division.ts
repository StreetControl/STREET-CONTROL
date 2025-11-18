/**
 * DIVISION ROUTES
 * Routes for automatic division of athletes into flights and groups
 */

import { Router } from 'express';
import { createDivision, getDivision, saveDivision, updateFlightsStructure } from '../controllers/divisionController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================

/**
 * POST /api/meets/:meetId/division/create
 * Automatically creates division structure (flights, groups, nominations)
 */
router.post('/:meetId/division/create', verifyToken, createDivision);

/**
 * GET /api/meets/:meetId/division
 * Returns current division structure
 */
router.get('/:meetId/division', verifyToken, getDivision);

/**
 * PUT /api/meets/:meetId/division/flights
 * Updates flight structure (name, day, time, groups) without affecting athlete assignments
 */
router.put('/:meetId/division/flights', verifyToken, updateFlightsStructure);

/**
 * POST /api/meets/:meetId/division/save
 * Saves modified division structure (after drag & drop)
 */
router.post('/:meetId/division/save', verifyToken, saveDivision);

/**
 * PATCH /api/meets/:meetId/division/weight-category
 * Updates weight category for an athlete
 */
router.patch('/:meetId/division/weight-category', verifyToken, async (req, res) => {
  try {
    const { formId, weightCatId } = req.body;

    if (!formId || !weightCatId) {
      return res.status(400).json({
        success: false,
        error: 'formId and weightCatId are required'
      });
    }

    const { supabaseAdmin } = await import('../services/supabase.js');
    
    const { error } = await supabaseAdmin
      .from('form_info')
      .update({ weight_cat_id: weightCatId })
      .eq('id', formId);

    if (error) {
      console.error('Error updating weight category:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update weight category'
      });
    }

    return res.json({
      success: true,
      message: 'Weight category updated successfully'
    });
  } catch (error: any) {
    console.error('Error in weight category update:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
