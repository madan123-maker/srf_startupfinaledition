import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Message } from '../models/Message';
import { User } from '../models/User';

export const getContacts = async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.user;
    const currentUserId = currentUser?.id;
    
    let query: any = { _id: { $ne: currentUserId } };
    
    // If the logged-in user is just a 'USER', only let them message admins
    if (currentUser?.role === 'USER') {
      query.role = { $in: ['ADMIN', 'SUPER_ADMIN'] };
    }

    // Get contacts based on query
    const contacts = await User.find(query)
      .select('name role state email')
      .lean();

    res.status(200).json(contacts);
  } catch (error) {
    console.error('Failed to get contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

export const getConversation = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const { userId: otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId },
      ],
    })
      .sort({ createdAt: 1 }) // Chronological order
      .lean();

    // Mark messages as read where current user is the receiver
    await Message.updateMany(
      { senderId: otherUserId, receiverId: currentUserId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error('Failed to get conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const { userId: receiverId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const newMessage = await Message.create({
      senderId: currentUserId,
      receiverId,
      content,
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
