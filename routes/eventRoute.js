import { Router } from 'express';
import { listEvents, getEventById } from '../controllers/eventController.js';
const r = Router();
r.get('/', listEvents);
r.get('/:id', getEventById);
export default r;
