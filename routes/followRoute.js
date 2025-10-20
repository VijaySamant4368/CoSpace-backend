import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { listFollowers, listFollowing, followOrg, unfollowOrg } from '../controllers/followController.js';

const r = Router();
r.get('/org/:id/followers', listFollowers);
r.get('/user/:id/following', listFollowing);
r.post('/follow', protect, followOrg);
r.post('/unfollow', protect, unfollowOrg);
export default r;
