import express from 'express';
import Thread from '../models/Thread.js';
import Channel from '../models/Channel.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Ensure default "Global" channel exists
const ensureGlobalChannel = async () => {
    const exists = await Channel.findOne({ isDefault: true });
    if (!exists) {
        // Find any admin to assign as creator, or use a placeholder
        const User = (await import('../models/User.js')).default;
        const admin = await User.findOne({ role: 'admin' });
        await Channel.create({
            name: 'Global',
            description: 'General discussions for all topics',
            isDefault: true,
            createdBy: admin ? admin._id : undefined
        });
    }
};

// Get all threads (optionally filter by channel)
router.get('/', protect, async (req, res) => {
    try {
        await ensureGlobalChannel();

        const filter = {};
        if (req.query.channel) {
            filter.channel = req.query.channel;
        }

        const threads = await Thread.find(filter)
            .populate('user', 'name email role')
            .populate('replies.user', 'name email role')
            .populate('channel', 'name')
            .sort({ isPinned: -1, createdAt: -1 });
        
        res.json({ success: true, data: threads });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single thread
router.get('/:id', protect, async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id)
            .populate('user', 'name email role')
            .populate('replies.user', 'name email role')
            .populate('channel', 'name');
        
        if (!thread) {
            return res.status(404).json({ success: false, message: 'Thread not found' });
        }

        // Increment view count
        thread.views += 1;
        await thread.save();

        res.json({ success: true, data: thread });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create thread
router.post('/', protect, async (req, res) => {
    try {
        // Check daily limit (10 threads per day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayThreadCount = await Thread.countDocuments({
            user: req.user.id,
            createdAt: { $gte: today }
        });

        if (todayThreadCount >= 10) {
            return res.status(429).json({ 
                success: false, 
                message: 'Daily thread limit reached (10 threads per day)' 
            });
        }

        // Determine channel - default to Global if not specified
        let channelId = req.body.channel;
        if (!channelId) {
            await ensureGlobalChannel();
            const globalChannel = await Channel.findOne({ isDefault: true });
            channelId = globalChannel._id;
        }

        // Verify channel exists
        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        // Auto-pin for admin and trusted users
        const shouldPin = req.user.role === 'admin' || req.user.role === 'trusted';

        const thread = await Thread.create({
            title: req.body.title,
            content: req.body.content,
            tags: req.body.tags,
            channel: channelId,
            user: req.user.id,
            isPinned: shouldPin
        });

        const populatedThread = await Thread.findById(thread._id)
            .populate('user', 'name email role')
            .populate('channel', 'name');

        res.status(201).json({ success: true, data: populatedThread });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add reply to thread
router.post('/:id/replies', protect, async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ success: false, message: 'Thread not found' });
        }

        thread.replies.push({
            user: req.user.id,
            content: req.body.content
        });

        await thread.save();

        const updatedThread = await Thread.findById(thread._id)
            .populate('user', 'name email role')
            .populate('replies.user', 'name email role')
            .populate('channel', 'name');

        res.json({ success: true, data: updatedThread });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Toggle prioritize thread (admin only)
router.put('/:id/prioritize', protect, adminOnly, async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ success: false, message: 'Thread not found' });
        }

        thread.isPrioritized = !thread.isPrioritized;
        // Prioritized threads are also pinned
        if (thread.isPrioritized) {
            thread.isPinned = true;
        }
        await thread.save();

        const updatedThread = await Thread.findById(thread._id)
            .populate('user', 'name email role')
            .populate('replies.user', 'name email role')
            .populate('channel', 'name');

        res.json({ success: true, data: updatedThread });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Toggle pin thread (admin only)
router.put('/:id/pin', protect, adminOnly, async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ success: false, message: 'Thread not found' });
        }

        thread.isPinned = !thread.isPinned;
        // If unpinning, also remove prioritized
        if (!thread.isPinned) {
            thread.isPrioritized = false;
        }
        await thread.save();

        const updatedThread = await Thread.findById(thread._id)
            .populate('user', 'name email role')
            .populate('replies.user', 'name email role')
            .populate('channel', 'name');

        res.json({ success: true, data: updatedThread });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete thread
router.delete('/:id', protect, async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ success: false, message: 'Thread not found' });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = thread.user.toString() === req.user.id;

        // Admin can delete any thread
        if (isAdmin) {
            await thread.deleteOne();
            return res.json({ success: true, message: 'Thread deleted' });
        }

        // Owner can delete only if thread is NOT prioritized by admin
        if (isOwner) {
            if (thread.isPrioritized) {
                return res.status(403).json({
                    success: false,
                    message: 'This thread has been prioritized by an admin and cannot be deleted'
                });
            }
            await thread.deleteOne();
            return res.json({ success: true, message: 'Thread deleted' });
        }

        return res.status(403).json({ success: false, message: 'Not authorized' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete reply
router.delete('/:threadId/replies/:replyId', protect, async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.threadId);

        if (!thread) {
            return res.status(404).json({ success: false, message: 'Thread not found' });
        }

        const reply = thread.replies.id(req.params.replyId);

        if (!reply) {
            return res.status(404).json({ success: false, message: 'Reply not found' });
        }

        // Admin or reply owner can delete
        const isAdmin = req.user.role === 'admin';
        if (reply.user.toString() !== req.user.id && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        reply.deleteOne();
        await thread.save();

        const updatedThread = await Thread.findById(thread._id)
            .populate('user', 'name email role')
            .populate('replies.user', 'name email role')
            .populate('channel', 'name');

        res.json({ success: true, data: updatedThread });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
