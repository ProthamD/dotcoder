# DotCoder Backend Architecture & Features Overview

This document outlines the architecture, advanced features, and security implementations of the DotCoder backend. It is designed to help you understand the core concepts and serve as a study guide for technical interviews.

---

## 1. Core Stack
* **Runtime:** Node.js
* **Framework:** Express.js (REST API)
* **Database:** MongoDB (via Mongoose ORM)
* **Caching & Rate Limiting:** Redis (via `ioredis`)

---

## 2. Authentication & Authorization

### JWT (JSON Web Tokens)
Authentication is completely stateless. Upon logging in (either via local password or Google OAuth), the server issues a JWT. This token is passed in the `Authorization: Bearer <token>` header for all protected routes.

### Role-Based Access Control (RBAC)
The application has three distinct roles: `user`, `trusted`, and `admin`. Access to specific API routes is heavily gated using custom middleware.

**Real Code (`backend/middleware/auth.js`):**
```javascript
// Protect routes (Requires valid JWT)
export const protect = async (req, res, next) => {
    // ... token extraction ...
    try {
        // 1. Check if token is blacklisted in Redis (Fail open if Redis is down)
        try {
            const isBlacklisted = await redis.get(`bl:${token}`);
            if (isBlacklisted) return res.status(401).json({ message: 'Token invalidated' });
        } catch (redisErr) { /* Skip if Redis is down */ }

        // 2. Verify signature
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        next();
    } catch (err) { /* Handle error */ }
};

// RBAC: Trusted or Admin only (e.g., creating channels)
export const trustedOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'trusted' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({ message: 'Trusted user access required' });
    }
};

// RBAC: Admin or Resource Owner (e.g., editing/deleting a thread)
export const adminOrOwner = (ownerIdFn) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    if (req.user.role === 'admin') return next();
    
    const ownerId = ownerIdFn(req);
    if (ownerId && ownerId.toString() === req.user.id.toString()) return next();
    
    return res.status(403).json({ message: 'Not authorized' });
};
```

---

## 3. Redis Implementation (Performance & Security)

We introduced Redis to solve three major architectural scaling issues: Session Revocation, Read-Heavy Database Queries, and Rate Limiting.

### A. JWT Blacklisting (Logout)
JWTs are stateless, meaning you can't normally "destroy" them on the server before they expire. We solved this by using Redis as a high-speed token blacklist. When a user logs out, we decode the JWT to find its exact remaining lifespan (TTL), and store it in Redis.

**Real Code (`backend/routes/auth.js`):**
```javascript
router.post('/logout', protect, async (req, res) => {
    const token = req.token;
    const decoded = jwt.decode(token);
    
    // Calculate exact remaining seconds until the JWT naturally expires
    const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;

    if (ttl > 0) {
        // Store in Redis with an automatic expiration matching the JWT
        await redis.setex(`bl:${token}`, ttl, '1');
    }
    res.status(200).json({ success: true });
});
```

### B. Thread List Caching
The "Discussion" page is heavily read. Querying MongoDB every time a user refreshes is incredibly inefficient. We cache the list of threads in Redis for 30 seconds. If a new thread is created, or a reply is posted, we instantly invalidate (delete) the cache so the next request gets fresh data.

**Real Code (`backend/routes/threads.js`):**
```javascript
// Dynamic Cache Key generation based on the channel
const threadsCacheKey = (channelId) => channelId ? `threads:channel:${channelId}` : 'threads:all';

// Cache Invalidation Function
async function clearThreadCaches(channelId) {
    const keys = ['threads:all'];
    if (channelId) keys.push(`threads:channel:${channelId.toString()}`);
    await redis.del(...keys);
}
```

### C. Rate Limiting
To prevent spam, users are limited to creating 10 threads per day. Instead of querying MongoDB (`Thread.countDocuments({ author: req.user.id })`), which is slow, we use an atomic Redis counter.

**Real Code (`backend/routes/threads.js`):**
```javascript
async function checkThreadRateLimit(userId) {
    const key = `ratelimit:threads:${userId}`;
    const count = await redis.incr(key); // Atomic increment
    
    if (count === 1) {
        // First post of the day: set expiration to exactly midnight
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const ttl = Math.ceil((endOfDay - now) / 1000);
        await redis.expire(key, ttl);
    }
    return count;
}

// In the POST /api/threads route:
const threadCount = await checkThreadRateLimit(req.user.id);
if (threadCount >= 11) {
    return res.status(429).json({ message: 'Daily thread limit reached (10/day).' });
}
```

---

## 4. Cursor-Based Pagination

Standard pagination (`.skip()` and `.limit()`) gets exponentially slower as the database grows because the database still has to scan over all the skipped documents. We upgraded the thread API to use **Cursor-based pagination** using the `_id` field.

Because MongoDB `_id` objects contain a timestamp, they are naturally ordered chronologically.

**Real Code (`backend/routes/threads.js`):**
```javascript
router.get('/', async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;
    const cursor = req.query.cursor;
    
    let query = { isPinned: false }; // Pinned threads fetched separately

    // If a cursor is provided, only fetch documents older (less than) the cursor ID
    if (cursor) {
        query._id = { $lt: cursor };
    }

    const threads = await Thread.find(query)
        .sort({ _id: -1 }) // Sort newest to oldest
        .limit(limit + 1)  // Fetch limit + 1 to check if there are more pages
        .populate('author', 'name role')
        .lean(); // .lean() strips heavy Mongoose methods for pure JSON performance

    // Check if there's a next page
    const hasMore = threads.length > limit;
    if (hasMore) threads.pop(); // Remove the extra item

    const nextCursor = hasMore ? threads[threads.length - 1]._id : null;

    res.status(200).json({ data: threads, nextCursor, hasMore });
});
```

---

## 5. Database Hardening & Indexes

To ensure MongoDB queries run in milliseconds (O(1) or O(log N) time) rather than scanning the whole collection (O(N) time), we applied strict indexing.

**Real Code (Mongoose Schemas):**
```javascript
// 1. Compound Index for fast Channel filtering and sorting by creation date
threadSchema.index({ channel: 1, createdAt: -1 });

// 2. Compound Index to find all threads by a specific author
threadSchema.index({ author: 1, createdAt: -1 });

// 3. TTL (Time-To-Live) Index for Automatic Document Deletion
// OTP documents automatically delete themselves from the database exactly when they expire.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

## 6. Full Domain Features

Beyond the core scaling and security architecture, the backend implements several complex domain-specific features.

### A. AI Integration (`routes/ai.js`)
The application integrates with Large Language Models (LLMs) to enhance the user experience.
* **Smart Summaries / Generation:** Users can trigger AI endpoints to generate content, summarize threads, or assist with coding questions.
* **AI Toggle:** Users can disable AI features globally via their `User.settings.aiEnabled` preference.

### B. Blog & Publishing Engine (`routes/blogs.js`)
A complete Content Management System (CMS) is built into the backend.
* **Draft -> Pending -> Published Pipeline:** Standard users cannot publish directly. They submit blogs as `pending`. Admins use the `GET /api/blogs/pending` route and then the `PUT /api/blogs/:id/review` route to either approve or reject with a reason.
* **Admin Override:** If a user with the `admin` role creates a blog with `status: 'published'`, the API automatically skips the review pipeline and publishes it instantly.
* **Social Features:** Built-in routes for tracking views (incremented on GET) and handling likes/unlikes.

**Real Code (Blog Admin Review Flow):**
```javascript
router.put('/:id/review', protect, adminOnly, async (req, res) => {
    const { action, rejectionReason } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (action === 'approve') {
        blog.status = 'published';
        blog.rejectionReason = '';
    } else if (action === 'reject') {
        blog.status = 'rejected';
        blog.rejectionReason = rejectionReason || 'Does not meet guidelines';
    }
    await blog.save();
    res.status(200).json({ success: true, data: blog });
});
```

### C. Learning Management System (LMS)
The backend acts as a course platform via two interconnected route files:
* **`routes/chapters.js`:** Users can create custom chapters to organize their learning. Features an explicit `/reorder/all` endpoint that uses MongoDB `bulkWrite` to efficiently update the order index of multiple chapters in a single database transaction.
* **`routes/questions.js`:** Questions are mapped as child documents to Chapters.

### D. Cheatsheets (`routes/cheatsheets.js`)
A dedicated resource engine for programming reference materials.
* Handles CRUD operations for rapid-reference sheets.
* Tied directly to user accounts for personalization.

### E. Advanced Authentication Workflows (`routes/auth.js`)
* **Google OAuth2:** Implemented using `google-auth-library`. The backend accepts an OAuth token from the frontend, verifies it directly with Google's servers, and either logs the user in or automatically provisions a new `User` document.
* **OTP Email Verification:** When users register natively, a cryptographically secure OTP (One Time Password) is generated using `crypto.randomBytes()`, hashed, and stored in the database.
* **Nodemailer:** Emails are sent asynchronously to verify accounts and handle password resets.

**Real Code (Secure OTP Generation):**
```javascript
userSchema.methods.generateVerificationToken = function () {
    // Generate a secure 32-byte random hex string
    const token = crypto.randomBytes(32).toString('hex');
    
    // Hash it before storing in the database for security (in case DB is breached)
    this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    // Return the unhashed token to email to the user
    return token;
};
```
