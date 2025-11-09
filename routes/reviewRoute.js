import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  addReview,
  getReview,
  deleteReview,
  getEventReviewsByRole,
} from '../controllers/reviewController.js';

const router = Router();

router.get('/event/:eventId/by-role', getEventReviewsByRole);

router.post('/:eventId', protect, addReview);
router.get('/:id', getReview);
router.delete('/:id', protect, deleteReview);

export default router;
