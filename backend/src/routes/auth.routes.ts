import { Router } from 'express';
import { login, sendOtp, verifyOtp, changePasswordWithOtp } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/change-password-otp', changePasswordWithOtp);

export default router;
