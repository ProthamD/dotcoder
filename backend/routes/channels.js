import express from 'express';
import Channel from '../models/Channel.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all channels
// @route   GET /api/channels
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const channels = await Channel.find()
            .populate('createdBy', 'name')
            .sort({ isDefault: -1, createdAt: 1 });

        res.json({ success: true, data: channels });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Create channel
// @route   POST /api/channels
// @access  Admin only
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Channel name is required' });
        }

        const existing = await Channel.findOne({ name: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Channel already exists' });
        }

        const channel = await Channel.create({
            name: name.trim(),
            description: description?.trim() || '',
            createdBy: req.user.id
        });

        const populated = await Channel.findById(channel._id).populate('createdBy', 'name');
        res.status(201).json({ success: true, data: populated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Delete channel (non-default only)
// @route   DELETE /api/channels/:id
// @access  Admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({ success: false, message: 'Channel not found' });
        }

        if (channel.isDefault) {
            return res.status(400).json({ success: false, message: 'Cannot delete the default channel' });
        }

        // Move threads from this channel to the default channel
        const defaultChannel = await Channel.findOne({ isDefault: true });
        if (defaultChannel) {
            const Thread = (await import('../models/Thread.js')).default;
            await Thread.updateMany(
                { channel: channel._id },
                { channel: defaultChannel._id }
            );
        }

        await channel.deleteOne();
        res.json({ success: true, message: 'Channel deleted. Threads moved to Global.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
