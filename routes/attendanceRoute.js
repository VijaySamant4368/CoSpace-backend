import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  attend,
  unattend,
  isMeAttending,
  getAttendeeDetails,
  getAttendingDetails, // events a specific user is attending
} from '../controllers/attendanceController.js';

const router = Router();

router.post('/attend', protect, attend);
router.post('/unattend', protect, unattend);
router.get('/isMeAttending/:eventId', protect, isMeAttending);
router.get('/:eventId/details', protect, getAttendeeDetails);
router.get('/user/:userId', protect, getAttendingDetails);

export default router;