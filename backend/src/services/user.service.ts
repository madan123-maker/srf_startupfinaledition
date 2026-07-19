import { User, Role } from '../models/User';
import { sendAdminCredentials, sendUserCredentials } from './email.service';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Generate a strong random password
const generatePassword = (): string => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';

  // Ensure at least one of each required character type
  const pass = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  // Fill rest of the password to 10 chars
  const all = upper + lower + digits + special;
  for (let i = 0; i < 6; i++) {
    pass.push(all[Math.floor(Math.random() * all.length)]);
  }

  // Shuffle the array so required chars aren't always at start
  return pass.sort(() => Math.random() - 0.5).join('');
};

export class UserService {
  async createAdmin(data: { 
    name: string; 
    email: string; 
    username?: string;
    organization?: string;
    state?: string;
    district?: string;
  }) {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: data.email.toLowerCase() },
        ...(data.username ? [{ username: data.username }] : [])
      ]
    });
    if (existingUser) {
      if (existingUser.email === data.email.toLowerCase()) {
        throw new Error(`A user with the email ${data.email} already exists.`);
      }
      throw new Error(`The username "${data.username}" is already taken.`);
    }

    // Generate a secure temporary password
    const tempPassword = generatePassword();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // Create the admin user in the database
    const newAdmin = await User.create({
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      username: data.username,
      organization: data.organization || 'DPIIT',
      state: data.state,
      district: data.district,
      role: Role.ADMIN,
      isActive: true,
    });

    // Send credentials to the admin's email via SMTP
    try {
      await sendAdminCredentials(data.email, data.name, tempPassword);
      console.log(`✅ Credentials email sent to ${data.email}`);
    } catch (emailError: any) {
      // Log but don't fail — admin is already created in DB
      console.error(`❌ SMTP Error: Failed to send email to ${data.email}:`, emailError.message);
    }

    return {
      id: newAdmin._id,
      email: newAdmin.email,
      name: newAdmin.name,
      username: newAdmin.username,
      role: newAdmin.role,
      organization: newAdmin.organization,
      state: newAdmin.state,
      district: newAdmin.district,
      createdAt: newAdmin.createdAt,
    };
  }

  async createUser(data: {
    name: string;
    email: string;
    username?: string;
    organization?: string;
    state?: string;
    district?: string;
  }) {
    const existingUser = await User.findOne({
      $or: [
        { email: data.email.toLowerCase() },
        ...(data.username ? [{ username: data.username }] : [])
      ]
    });
    if (existingUser) {
      if (existingUser.email === data.email.toLowerCase()) {
        throw new Error(`A user with the email ${data.email} already exists.`);
      }
      throw new Error(`The username "${data.username}" is already taken.`);
    }

    const tempPassword = generatePassword();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    const newUser = await User.create({
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      username: data.username,
      organization: data.organization,
      state: data.state,
      district: data.district,
      role: Role.USER,
      isActive: true,
    });

    try {
      await sendUserCredentials(data.email, data.name, tempPassword);
      console.log(`✅ User credentials email sent to ${data.email}`);
    } catch (emailError: any) {
      console.error(`❌ SMTP Error: Failed to send email to ${data.email}:`, emailError.message);
    }

    return {
      id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      username: newUser.username,
      role: newUser.role,
      organization: newUser.organization,
      state: newUser.state,
      district: newUser.district,
      createdAt: newUser.createdAt,
    };
  }

  async getAllUsers(callerId?: string, callerRole?: string) {
    let filter: any = {};
    if (callerRole === Role.ADMIN && callerId) {
      const caller = await User.findById(callerId);
      if (caller) {
        if (caller.state) {
          // State Admins see users strictly in their state
          filter.state = caller.state;
        } else if (caller.organization) {
          // Central Admins (no state) see all regular users + their own organization
          filter = {
            $or: [
              { role: Role.USER },
              { organization: caller.organization }
            ]
          };
        }
      }
    }

    const users = await User.find(filter)
      .select('-passwordHash') // Never expose the password hash
      .sort({ createdAt: -1 })
      .lean();
    return users;
  }

  async deleteUser(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.role === Role.SUPER_ADMIN) {
      throw new Error('The Super Admin account cannot be deleted.');
    }
    await User.findByIdAndDelete(userId);
    return { success: true };
  }
}
