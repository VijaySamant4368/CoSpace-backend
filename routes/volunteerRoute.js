import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  volunteer,
  unvolunteer,
  listVolunteers,
  listUserVolunteered,
  approveVolunteer,
  rejectVolunteer,
  isMeVolunteering,
} from '../controllers/volunteerController.js';

const router = Router();

router.post('/volunteer/:eventId', protect, volunteer);
router.post('/unvolunteer/:eventId', protect, unvolunteer);
router.get('/volunteers/:eventId', protect, listVolunteers);
router.get('/volunteered/:userId', listUserVolunteered);
router.post('/approve/:eventId/:userId', protect, approveVolunteer);
router.post('/reject/:eventId/:userId', protect, rejectVolunteer);
router.get('/isMeVolunteering/:eventId', protect, isMeVolunteering);

export default router;
