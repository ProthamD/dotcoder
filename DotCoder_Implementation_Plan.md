# DotCoder — Implementation Plan
> For Minimax M2.5 (or any AI coding agent)
> Codebase: `dot_coder_notebook/` — Node.js + Express + MongoDB + React/Vite

---

## What Actually Exists vs What's Claimed

| Feature | Status | Notes |
|---|---|---|
| JWT auth | ✅ Done | `middleware/auth.js` — `protect`, `adminOnly`, `generateToken` |
| Role system (user/admin/trusted) | ✅ Done | `User.role` enum, `adminOnly` middleware exists |
| RBAC (route-level enforcement) | ⚠️ Partial | `adminOnly` used on pin/prioritize only. No `trusted`-role gates anywhere. No permission middleware for write operations beyond ownership check. |
| Redis | ❌ Not implemented | `package.json` has no `ioredis` or `redis`. No caching anywhere. |
| Rate limiting | ⚠️ Partial | Thread creation has a manual 10/day DB count check. No middleware-level rate limiting. |
| Cursor-based pagination | ❌ Not implemented | All list endpoints use `.find()` with no limit/skip/cursor. Everything is fetched in full. |
| Compound indexes | ✅ Done | `Thread` has 3 compound indexes. Other models have none. |
| Kafka / distributed messaging | ❌ Not implemented | |
| AI moderation | ✅ Done | `routes/ai.js` exists, Gemini + Grok APIs used |
| Google OAuth | ✅ Done | `routes/auth.js` has `/google` endpoint |
| Email verification (OTP) | ✅ Done | Full OTP flow in `routes/auth.js` |

---

## Phase 1 — RBAC (Complete What's Claimed)

### What's missing
The `trusted` role exists in the User model but is never enforced on any route. Thread creation auto-pins trusted users but there's no middleware gate for trusted-only actions (e.g. creating channels, posting without daily limits).

### Changes needed

**`backend/middleware/auth.js`** — Add two new middleware functions after `adminOnly`:

```js
// Trusted or admin
export const trustedOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'trusted' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Trusted user access required' });
    }
};

// Admin or owner of resource — call with ownerIdFn = (req) => the owner's userId string
export const adminOrOwner = (ownerIdFn) => (req, res, next) => {
    if (req.user.role === 'admin') return next();
    const ownerId = ownerIdFn(req);
    if (ownerId && ownerId.toString() === req.user.id.toString()) return next();
    return res.status(403).json({ success: false, message: 'Not authorized' });
};
```

**`backend/routes/threads.js`** — The delete thread and delete reply already do ownership checks inline. Refactor to use `adminOrOwner` middleware for consistency, and apply `trustedOnly` to channel creation.

**`backend/routes/channels.js`** — Check this file. Channel creation should be `protect` + `adminOnly` or `trustedOnly`. Verify it's not open to all authenticated users.

**No frontend changes needed for RBAC** — role is already returned in auth response and stored in context.

---

## Phase 2 — Redis (Session Cache + Hot Data)

### Install
```bash
npm install ioredis
```

### Create `backend/config/redis.js`
```js
import Redis from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Redis connected'));

export default redis;
```

Add to `.env`:
```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Use Redis for: Thread list cache

**`backend/routes/threads.js`** — Cache the thread list per channel. Thread list is the most-read, least-mutating endpoint.

```js
import redis from '../config/redis.js';

// In GET / handler, before DB query:
const cacheKey = `threads:${req.query.channel || 'all'}`;
const cached = await redis.get(cacheKey);
if (cached) return res.json(JSON.parse(cached));

// After DB query, before res.json:
await redis.setex(cacheKey, 60, JSON.stringify({ success: true, data: threads })); // 60s TTL
```

**Cache invalidation** — In POST `/` (create thread), PUT `/:id/pin`, PUT `/:id/prioritize`, DELETE `/:id`:
```js
await redis.del(`threads:${channelId}`);
await redis.del('threads:all');
```

### Use Redis for: JWT token blacklist (logout)

Currently there's no logout endpoint — tokens live until expiry. Add:

**`backend/routes/auth.js`** — Add logout route:
```js
// POST /api/auth/logout — blacklist the token
router.post('/logout', protect, async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await redis.setex(`blacklist:${token}`, ttl, '1');
    res.json({ success: true, message: 'Logged out' });
});
```

**`backend/middleware/auth.js`** — In `protect`, after `jwt.verify`:
```js
const isBlacklisted = await redis.get(`blacklist:${token}`);
if (isBlacklisted) return res.status(401).json({ success: false, message: 'Token revoked' });
```

### Use Redis for: Rate limiting (replace DB-count hack)

Replace the `Thread.countDocuments` daily-limit check with a Redis counter — faster and doesn't hit MongoDB:

```js
// In POST /api/threads, replace the countDocuments block:
const rateLimitKey = `ratelimit:threads:${req.user.id}:${new Date().toDateString()}`;
const count = await redis.incr(rateLimitKey);
if (count === 1) await redis.expire(rateLimitKey, 86400); // expires at midnight-ish
if (count > 10) {
    return res.status(429).json({ success: false, message: 'Daily thread limit reached (10 per day)' });
}
```

---

## Phase 3 — Cursor-Based Pagination

### What's wrong now
Every `GET /api/threads`, `GET /api/blogs`, `GET /api/chapters` etc. does `.find(filter)` with no limit. With 1000+ threads this will be slow and memory-heavy.

### Implementation for threads (replicate pattern for blogs, chapters, cheatsheets)

**`backend/routes/threads.js`** — Replace the GET `/` query:

```js
router.get('/', protect, async (req, res) => {
    try {
        await ensureGlobalChannel();

        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor; // _id of last item from previous page

        const filter = {};
        if (req.query.channel) filter.channel = req.query.channel;
        if (cursor) filter._id = { $lt: cursor }; // fetch items older than cursor

        const threads = await Thread.find(filter)
            .populate('user', 'name email role')
            .populate('replies.user', 'name email role')
            .populate('channel', 'name')
            .sort({ isPinned: -1, _id: -1 })
            .limit(limit + 1); // fetch one extra to check if there's a next page

        const hasMore = threads.length > limit;
        if (hasMore) threads.pop();

        const nextCursor = hasMore ? threads[threads.length - 1]._id : null;

        res.json({ success: true, data: threads, nextCursor, hasMore });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
```

**Frontend `src/pages/Discussion/Discussion.jsx`** — Add infinite scroll or "Load more" button:
- Store `nextCursor` in state
- On "Load more", pass `cursor=nextCursor` as query param
- Append new threads to existing list (don't replace)

---

## Phase 4 — Kafka (Distributed Event Queue)

> Use this when you need to scale writes and decouple AI moderation, notifications, and analytics from the request lifecycle. Don't add this until Phase 1-3 are done — it's overkill without caching and pagination in place first.

### When to use Kafka here
- Thread created → trigger AI moderation async (don't block the HTTP response)
- Reply added → notify thread owner async
- View count incremented → batch-write to DB instead of per-request save

### Install
```bash
npm install kafkajs
```

### Create `backend/config/kafka.js`
```js
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
    clientId: 'dotcoder',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: 'dotcoder-group' });

export const connectKafka = async () => {
    await producer.connect();
    console.log('Kafka producer connected');
};
```

### Topics to create
| Topic | Producer | Consumer | Action |
|---|---|---|---|
| `thread.created` | threads route (on POST) | AI moderation worker | Run Gemini moderation, flag if needed |
| `thread.reply` | threads route (on reply POST) | notification worker | Email/in-app notify thread owner |
| `thread.viewed` | threads route (on GET /:id) | analytics worker | Batch increment view count every 30s |
| `user.registered` | auth route (on register) | email worker | Send welcome email async |

### Example — async AI moderation on thread create

**`backend/routes/threads.js`** — After `Thread.create(...)`:
```js
// Fire and forget — don't await, don't block response
producer.send({
    topic: 'thread.created',
    messages: [{ value: JSON.stringify({ threadId: thread._id, content: req.body.content }) }]
}).catch(console.error);
```

**`backend/workers/moderationWorker.js`** — New file:
```js
import { consumer } from '../config/kafka.js';
import Thread from '../models/Thread.js';
import { moderateContent } from '../utils/ai.js'; // your existing Gemini call

await consumer.subscribe({ topic: 'thread.created', fromBeginning: false });

await consumer.run({
    eachMessage: async ({ message }) => {
        const { threadId, content } = JSON.parse(message.value.toString());
        const isFlagged = await moderateContent(content);
        if (isFlagged) {
            await Thread.findByIdAndUpdate(threadId, { isFlagged: true, isHidden: true });
        }
    }
});
```

Start this worker as a separate process in `Procfile`:
```
web: node backend/server.js
worker: node backend/workers/moderationWorker.js
```

### View count batching with Kafka

Instead of `thread.views += 1; await thread.save()` on every GET (very expensive at scale):

```js
// In GET /:id — just emit event, don't touch DB
producer.send({
    topic: 'thread.viewed',
    messages: [{ value: threadId }]
}).catch(console.error);

// In viewCountWorker.js — batch flush every 30s
const viewCounts = {};
consumer.run({
    eachMessage: async ({ message }) => {
        const threadId = message.value.toString();
        viewCounts[threadId] = (viewCounts[threadId] || 0) + 1;
    }
});

setInterval(async () => {
    for (const [threadId, count] of Object.entries(viewCounts)) {
        await Thread.findByIdAndUpdate(threadId, { $inc: { views: count } });
        delete viewCounts[threadId];
    }
}, 30000);
```

---

## Missing Indexes — Add These Now

`Thread` is indexed. Other models are not. Add these in each model file:

**`backend/models/Blog.js`**
```js
blogSchema.index({ createdAt: -1 });
blogSchema.index({ author: 1, createdAt: -1 });
```

**`backend/models/Channel.js`**
```js
channelSchema.index({ isDefault: 1 });
```

**`backend/models/OTP.js`**
```js
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index — auto-delete expired OTPs
otpSchema.index({ email: 1 });
```

---

## `.env` additions needed

```
# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Kafka (only if adding Phase 4)
KAFKA_BROKER=localhost:9092
```

---

## Implementation Order

1. **RBAC** — 1-2 hours. Pure middleware additions, zero risk to existing routes.
2. **Redis** — caching + rate limiting + blacklist. 2-3 hours. Start with thread cache only, add blacklist after.
3. **Pagination** — 2-3 hours. Do backend first, then update frontend Discussion page.
4. **Missing indexes** — 30 minutes. Just add and redeploy.
5. **Kafka** — 1-2 days. Set up broker first (Docker recommended for local), then add one topic at a time starting with `thread.created`.

---

## What NOT to change

- Auth flow (OTP + Google OAuth) — fully working, don't touch
- JWT structure — works correctly
- MongoDB connection — fine as is
- Frontend auth context — works, role is available
- Existing route structure — extend, don't rewrite
