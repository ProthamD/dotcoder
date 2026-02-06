import express from 'express';
import Thread from '../models/Thread.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all threads
router.get('/', protect, async (req, res) => {
    try {
        const threads = await Thread.find()
            .populate('user', 'name email')
            .populate('replies.user', 'name email')
            .sort({ createdAt: -1 });
        
        res.json({ success: true, data: threads });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single thread
router.get('/:id', protect, async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id)
            .populate('user', 'name email')
            .populate('replies.user', 'name email');
        
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

        const thread = await Thread.create({
            ...req.body,
            user: req.user.id
        });

        const populatedThread = await Thread.findById(thread._id)
            .populate('user', 'name email');

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
            .populate('user', 'name email')
            .populate('replies.user', 'name email');

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

        // Only thread owner can delete
        if (thread.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await thread.deleteOne();
        res.json({ success: true, message: 'Thread deleted' });
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

        // Only reply owner can delete
        if (reply.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        reply.deleteOne();
        await thread.save();

        const updatedThread = await Thread.findById(thread._id)
            .populate('user', 'name email')
            .populate('replies.user', 'name email');

        res.json({ success: true, data: updatedThread });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
