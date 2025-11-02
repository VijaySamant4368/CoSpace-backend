import { Router } from 'express';
import {
  donate,
  userPastDonation,
  eventPastDonation,
  orgPastDonation,
  orgPastDonationByUser,
} from '../controllers/donationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/donate', protect, donate);
router.get('/user/:userId', userPastDonation);
router.get('/event/:eventId', eventPastDonation);
router.get('/eventPastDonation/:eventId', eventPastDonation);
router.get('/org/:orgId', orgPastDonation);
router.get('/org/:orgId/user/:userId', orgPastDonationByUser);

export default router;
