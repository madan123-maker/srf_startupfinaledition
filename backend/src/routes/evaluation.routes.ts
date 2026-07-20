import { Router } from 'express';
import { scoreQuestion, getScoreSummary } from '../controllers/evaluation.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Protected admin routes
router.post('/submission/:submissionId/question/:questionId', protect as any, adminOnly as any, scoreQuestion);
router.get('/submission/:submissionId/summary', protect as any, adminOnly as any, getScoreSummary);

export default router;
