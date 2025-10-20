import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  listOrgs, getOrgById, getMeOrg,
  getOrgEvents, getOrgFollowerCount, getOrgDashboard
} from '../controllers/orgController.js';

const r = Router();
r.get('/', listOrgs);
r.get('/me', protect, getMeOrg);
r.get('/:id', getOrgById);
r.get('/:id/events', getOrgEvents);
r.get('/:id/followers/count', getOrgFollowerCount);
r.get('/:id/dashboard', getOrgDashboard);
export default r;
