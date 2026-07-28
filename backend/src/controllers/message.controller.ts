import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { Notification } from '../models/Notification';

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

    // Attach unread counts & last message for each contact
    const contactsWithMeta = await Promise.all(
      contacts.map(async (contact) => {
        const unreadCount = await Message.countDocuments({
          senderId: contact._id,
          receiverId: currentUserId,
          isRead: false
        });

        const lastMsg = await Message.findOne({
          $or: [
            { senderId: currentUserId, receiverId: contact._id },
            { senderId: contact._id, receiverId: currentUserId }
          ]
        })
          .sort({ createdAt: -1 })
          .select('content createdAt')
          .lean();

        return {
          ...contact,
          unreadCount,
          lastMessage: lastMsg?.content || '',
          lastMessageTime: lastMsg?.createdAt || null
        };
      })
    );

    // Sort contacts by unread count first, then by last message time
    contactsWithMeta.sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });

    res.status(200).json(contactsWithMeta);
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

    // Create Notification for receiver
    try {
      const sender = await User.findById(currentUserId).select('name role state email');
      const receiver = await User.findById(receiverId).select('role');
      if (sender && receiver) {
        const senderName = sender.name || sender.state || sender.email || 'Someone';
        const targetLink = receiver.role === 'USER' ? '/user-dashboard/messages' : '/admin/messages';
        const snippet = content.length > 35 ? content.substring(0, 35) + '...' : content;
        
        await Notification.create({
          userId: receiverId,
          message: `New message from ${senderName}: "${snippet}"`,
          link: targetLink,
          isRead: false
        });
      }
    } catch (notifErr) {
      console.error('Failed to send notification for message:', notifErr);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const getUnreadLatestMessages = async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const messages = await Message.find({
      receiverId: currentUserId,
      isRead: false
    })
      .populate('senderId', 'name role state email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json(messages);
  } catch (error) {
    console.error('Failed to get unread messages:', error);
    res.status(500).json({ error: 'Failed to fetch unread messages' });
  }
};
