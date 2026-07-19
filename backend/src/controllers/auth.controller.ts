import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, isAdminLogin } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password, !!isAdminLogin);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(401).json({ error: error.message || 'Authentication failed' });
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await authService.generateAndSendOtp(email);
    return res.status(200).json({ message: 'OTP sent successfully to ' + email });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to send OTP' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    await authService.verifyOtp(email, otp);
    return res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to verify OTP' });
  }
};

export const changePasswordWithOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    await authService.resetPasswordWithOtp(email, otp, newPassword);
    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to change password' });
  }
};
