import { User } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { auditLogService } from './auditlog.service';

export class AuthService {
  async login(email: string, passwordPlain: string, isAdminLogin: boolean) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Role check depending on the login portal
    if (isAdminLogin && user.role === 'USER') {
      throw new Error('Unauthorized access. Admins only.');
    }
    if (!isAdminLogin && user.role !== 'USER') {
      throw new Error('Please use the Admin portal to login.');
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      secret,
      { expiresIn: '1d' }
    );

    // Record login in audit log
    await auditLogService.createLog({
      userId: user._id.toString(),
      userName: user.name || 'System User',
      userRole: user.role,
      action: 'User login (Backend Verified)',
      entity: 'auth',
      entityId: user.email,
    });

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        state: user.state,
      },
    };
  }

  async generateAndSendOtp(email: string) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await user.save();

    // Import dynamically to avoid circular dependencies if any, though regular import is fine
    const { sendOtpEmail } = require('./email.service');
    await sendOtpEmail(email, otp);
    return user;
  }

  async verifyOtp(email: string, otp: string) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    if (!user.otp || user.otp !== otp) {
      throw new Error('Invalid OTP');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) {
      throw new Error('OTP has expired');
    }
    
    return true;
  }

  async resetPasswordWithOtp(email: string, otp: string, newPasswordPlain: string) {
    await this.verifyOtp(email, otp);
    
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPasswordPlain, salt);
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    await auditLogService.createLog({
      userId: user._id.toString(),
      userName: user.name || 'System User',
      userRole: user.role,
      action: 'Password reset via OTP',
      entity: 'auth',
      entityId: user.email,
    });

    return user;
  }
}
