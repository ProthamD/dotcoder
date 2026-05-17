import express from 'express';
import Thread from '../models/Thread.js';
import Channel from '../models/Channel.js';
import redis from '../config/redis.js';
import { protect, adminOnly, adminOrOwner } from '../middleware/auth.js';

const THREADS_CACHE_TTL = 30; // 30 seconds

function threadsCacheKey(channel) {
    return channel ? `threads:channel:${channel}` : 'threads:all';
}

async function clearThreadCaches(channelId) {
    const keys = ['threads:all'];
    if (channelId) keys.push(`threads:channel:${channelId.toString()}`);
    await redis.del(...keys);
}

// Redis-based rate limiting: 10 threads per day per user
async function checkThreadRateLimit(userId) {
    const key = `ratelimit:threads:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) {
        // Set expiry to end of day
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const ttl = Math.ceil((endOfDay - now) / 1000);
        await redis.expire(key, ttl);
    }
    return count;
}

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

// Get all threads (optionally filter by channel, with cursor-based pagination)
router.get('/', protect, async (req, res) => {
    try {
        await ensureGlobalChannel();

        const { channel, cursor, limit: limitParam } = req.query;
        const limit = Math.min(parseInt(limitParam) || 20, 50);

        // Cache the initial page load (no cursor) for 30 seconds
        if (!cursor) {
            const cacheKey = threadsCacheKey(channel);
            const cached = await redis.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }
        }

        const baseFilter = {};
        if (channel) {
            baseFilter.channel = channel;
        }

        // Pinned threads are always returned on initial load (no cursor)
        let pinnedThreads = [];
        if (!cursor) {
            pinnedThreads = await Thread.find({ ...baseFilter, isPinned: true })
                .populate('user', 'name email role')
                .populate('replies.user', 'name email role')
                .populate('channel', 'name')
                .sort({ isPrioritized: -1, createdAt: -1 });
        }

        // Cursor-based pagination for non-pinned threads
        const filter = { ...baseFilter, isPinned: { $ne: true } };
        if (cursor) {
            filter._id = { $lt: cursor };
        }

        // Fetch limit + 1 to detect if more exist
        const threads = await Thread.find(filter)
            .populate('user', 'name email role')
            .populate('replies.user', 'name email role')
            .populate('channel', 'name')
            .sort({ createdAt: -1 })
            .limit(limit + 1);

        const hasMore = threads.length > limit;
        if (hasMore) threads.pop();

        const nextCursor = hasMore ? threads[threads.length - 1]._id : null;

        // Combine: pinned first, then paginated threads
        const data = [...pinnedThreads, ...threads];

        const result = { success: true, data, nextCursor, hasMore };

        // Cache initial page load
        if (!cursor) {
            await redis.setex(threadsCacheKey(channel), THREADS_CACHE_TTL, JSON.stringify(result));
        }

        res.json(result);
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
        // Daily thread limit: 10 threads per day (Redis-based)
        const threadCount = await checkThreadRateLimit(req.user.id);

        if (threadCount > 10) {
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

        await clearThreadCaches(channelId);

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

        await clearThreadCaches(thread.channel);

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

        await clearThreadCaches(thread.channel);

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

        await clearThreadCaches(thread.channel);

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
            const channelId = thread.channel;
            await thread.deleteOne();
            await clearThreadCaches(channelId);
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
            const channelId = thread.channel;
            await thread.deleteOne();
            await clearThreadCaches(channelId);
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

        await clearThreadCaches(thread.channel);

        res.json({ success: true, data: updatedThread });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
