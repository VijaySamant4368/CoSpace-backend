import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  listOrgs, getOrgById, getMeOrg,
  getOrgEvents, getOrgFollowerCount, getMyDashboard
} from '../controllers/orgController.js';

const router = Router();
router.get('/', listOrgs);
router.get('/me', protect, getMeOrg);
router.get('/dashboard', protect, getMyDashboard);
router.get('/:id', getOrgById);
router.get('/:id/events', getOrgEvents);
router.get('/:id/followers/count', getOrgFollowerCount);
export default router;