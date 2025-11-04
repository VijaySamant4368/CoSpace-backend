import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  createCollabRequest,
  myCollabRequestStatus,
  listPendingRequests,
  acceptRequest,
  rejectRequest,
  cancelMyRequest
} from '../controllers/collaborationController.js';


const router = Router();
router.post('/:eventId/requests', protect, createCollabRequest);
router.get('/:eventId/requests/me', protect, myCollabRequestStatus);
router.get('/:eventId/requests', protect, listPendingRequests);
router.post('/:eventId/requests/:requestId/accept', protect, acceptRequest);
router.post('/:eventId/requests/:requestId/reject', protect, rejectRequest);
router.delete('/:eventId/requests/:requestId', protect, cancelMyRequest);

export default router;