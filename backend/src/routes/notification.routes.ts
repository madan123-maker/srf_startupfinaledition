import express from 'express';
import { getMyNotifications, markNotificationsAsRead } from '../controllers/notification.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);

router.get('/my', getMyNotifications);
router.post('/mark-read', markNotificationsAsRead);

export default router;
