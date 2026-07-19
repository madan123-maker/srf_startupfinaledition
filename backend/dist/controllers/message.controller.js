"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.getConversation = exports.getContacts = void 0;
const Message_1 = require("../models/Message");
const User_1 = require("../models/User");
const getContacts = async (req, res) => {
    try {
        const currentUserId = req.user?.id;
        // Get all users except the currently logged in user
        const contacts = await User_1.User.find({ _id: { $ne: currentUserId } })
            .select('name role')
            .lean();
        res.status(200).json(contacts);
    }
    catch (error) {
        console.error('Failed to get contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
};
exports.getContacts = getContacts;
const getConversation = async (req, res) => {
    try {
        const currentUserId = req.user?.id;
        const { userId: otherUserId } = req.params;
        const messages = await Message_1.Message.find({
            $or: [
                { senderId: currentUserId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: currentUserId },
            ],
        })
            .sort({ createdAt: 1 }) // Chronological order
            .lean();
        // Mark messages as read where current user is the receiver
        await Message_1.Message.updateMany({ senderId: otherUserId, receiverId: currentUserId, isRead: false }, { $set: { isRead: true } });
        res.status(200).json(messages);
    }
    catch (error) {
        console.error('Failed to get conversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
};
exports.getConversation = getConversation;
const sendMessage = async (req, res) => {
    try {
        const currentUserId = req.user?.id;
        const { userId: receiverId } = req.params;
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content cannot be empty' });
        }
        const newMessage = await Message_1.Message.create({
            senderId: currentUserId,
            receiverId,
            content,
        });
        res.status(201).json(newMessage);
    }
    catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};
exports.sendMessage = sendMessage;
