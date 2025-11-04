import { Router } from 'express';
import { unifiedSearch, suggest } from '../controllers/searchController.js';

const router = Router();

router.get('/', unifiedSearch);
router.get('/suggest', suggest);

export default router;
