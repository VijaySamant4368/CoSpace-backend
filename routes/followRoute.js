import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { listFollowers, listFollowing, followOrg, unfollowOrg, doIFollow, doesFollowMe } from '../controllers/followController.js';

const router = Router();
router.get('/org/:id/followers', listFollowers);
router.get('/user/:id/following', listFollowing);
router.get('/follow/doIFollow/:orgId', protect, doIFollow);
router.get('/follow/doesFollowMe/:userId', protect, doesFollowMe);
router.post('/follow', protect, followOrg);
router.post('/unfollow', protect, unfollowOrg);
export default router;
