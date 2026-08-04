import { Router } from 'express';
import { login, sendOtp, verifyOtp, changePasswordWithOtp } from '../controllers/auth.controller';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/login', authLimiter, login);
router.post('/send-otp', authLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/change-password-otp', authLimiter, changePasswordWithOtp);

export default router;
