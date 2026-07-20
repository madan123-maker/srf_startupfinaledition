import { Request, Response } from 'express';
import { Notification } from '../models/Notification';

export const getMyNotifications = async (req: any, res: Response) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.status(200).json(notifications);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching notifications' });
  }
};

export const markNotificationsAsRead = async (req: any, res: Response) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    return res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error updating notifications' });
  }
};
