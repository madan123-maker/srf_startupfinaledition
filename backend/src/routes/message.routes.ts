import { Router } from 'express';
import { getContacts, getConversation, sendMessage } from '../controllers/message.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(protect as any);

router.get('/contacts', getContacts);
router.get('/:userId', getConversation);
router.post('/:userId', sendMessage);

export default router;
