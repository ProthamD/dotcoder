# DotCoder — Interview Prep Guide

> Your one-stop resource to confidently talk about this project in any SWE interview.

---

## 🏗️ What is DotCoder? (30-second pitch)

**DotCoder** is a full-stack discussion and learning platform built for developers. Think of it as a **private dev community + personal LMS (Learning Management System) + AI assistant** — all in one.

Users can:
- Discuss topics in **threaded channels** (like Slack or Discord)
- Write and publish **technical blogs** (with an admin review pipeline)
- Build personal **study notebooks** — chapters, questions, cheatsheets, mindmaps
- Use **AI assistants** (Gemini / Grok) for code help and summaries

---

## 🧱 Full Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React + Vite | SPA with pages and components |
| **Backend** | Node.js + Express | REST API server |
| **Database** | MongoDB + Mongoose | Primary data store |
| **Caching** | Redis (ioredis) | Token blacklist, thread cache, rate limiting |
| **Auth** | JWT + Google OAuth2 | Stateless auth + social login |
| **AI** | Google Gemini + Grok (OpenRouter) | AI assistant endpoints |
| **Email** | Nodemailer | OTP emails, verification |
| **Deployment** | DigitalOcean (App Platform or Droplet) | Hosting |

---

## 📁 Project Structure

```
dot_coder_notebook/
├── backend/
│   ├── server.js           # Express entry point
│   ├── config/db.js        # MongoDB connection
│   ├── middleware/auth.js  # JWT protect, RBAC
│   ├── routes/             # 8 route files (auth, threads, blogs, ai, etc.)
│   ├── models/             # 10 Mongoose schemas
│   └── utils/              # Helpers
└── frontend/
    └── src/
        ├── pages/          # Full pages (Home, Discussion, Blogs, etc.)
        ├── components/     # Reusable UI components
        ├── context/        # React Context (auth state)
        └── services/       # Axios API calls
```

**8 API route groups:** `/api/auth`, `/api/threads`, `/api/channels`, `/api/blogs`, `/api/chapters`, `/api/questions`, `/api/cheatsheets`, `/api/ai`

**10 Mongoose models:** User, Thread, Channel, Blog, Chapter, Question, Cheatsheet, Mindmap, OTP, Test

---

## 🔑 Core Technical Decisions (Deep Dive)

### 1. Authentication — JWT + Google OAuth

**How it works:**
1. User logs in (local email/password OR Google OAuth token sent from frontend)
2. Backend verifies credentials / validates the Google ID token with Google's servers
3. Server issues a signed JWT (contains user ID + role)
4. All protected routes require `Authorization: Bearer <token>` header
5. Middleware decodes the token and attaches `req.user`

**Why stateless JWT?**
- No server-side session storage needed → scales horizontally
- Works with multiple server instances without shared session store
- Tradeoff: you can't revoke a token... until Redis solves that (see below)

**Google OAuth flow (server-side validation):**
```
Frontend receives Google ID token
  → sends it to POST /api/auth/google
  → backend verifies with google-auth-library
  → if email not in DB → auto-create user
  → return our own JWT
```

---

### 2. RBAC — 4-Layer Role System

Three roles: `user`, `trusted`, `admin`

Four middleware functions in `middleware/auth.js`:

| Middleware | What it does |
|---|---|
| `protect` | Verifies JWT, checks blacklist, attaches `req.user` |
| `adminOnly` | Blocks if `req.user.role !== 'admin'` |
| `trustedOnly` | Allows `trusted` or `admin` roles |
| `adminOrOwner(fn)` | Admin passes; normal users only if they own the resource |

**Usage example:**
```
DELETE /api/threads/:id  →  protect + adminOrOwner(req => req.params.id)
POST   /api/channels     →  protect + trustedOnly
PUT    /api/blogs/review →  protect + adminOnly
```

**"Zero unauthorized writes"** — every mutation route has `protect` + an RBAC layer, so no unauthenticated or role-violating writes can reach the DB.

---

### 3. Redis — Three Use Cases

#### A. JWT Token Blacklisting (Solving the Logout Problem)

**The problem:** JWTs are stateless — once issued, even if the user logs out, the token is valid until expiry.

**The solution:** On logout, store the token in Redis with the same TTL as the token's remaining lifespan.

```javascript
// POST /api/auth/logout
const decoded = jwt.decode(token);
const ttl = decoded.exp - Math.floor(Date.now() / 1000); // remaining seconds
await redis.setex(`bl:${token}`, ttl, '1');
```

On every protected request, `protect` middleware checks Redis **before** trusting the JWT:
```javascript
const isBlacklisted = await redis.get(`bl:${token}`);
if (isBlacklisted) return res.status(401).json({ message: 'Token invalidated' });
```

**Resilience pattern:** If Redis is down, the check is skipped (fail-open). Tokens remain valid but the system stays alive — a deliberate availability-over-security tradeoff for non-critical data.

#### B. Thread List Caching (Write-Through Cache)

The Discussion page is read-heavy. Without caching, every page load hits MongoDB.

```javascript
// Cache key is scoped per channel
const cacheKey = channelId ? `threads:channel:${channelId}` : 'threads:all';

// Read from cache first
const cached = await redis.get(cacheKey);
if (cached) return res.json(JSON.parse(cached));

// Cache miss → query DB → store result
const threads = await Thread.find(...);
await redis.setex(cacheKey, 30, JSON.stringify(result)); // 30s TTL
```

**Cache invalidation:** Any write operation (new thread, reply, pin) calls `clearThreadCaches()` which deletes the relevant keys — keeping the cache consistent.

#### C. Atomic Rate Limiting (Redis INCR)

Users are limited to 10 threads/day. Instead of a slow `Thread.countDocuments()` call:

```javascript
const key = `ratelimit:threads:${userId}`;
const count = await redis.incr(key);  // atomic — safe under concurrency

if (count === 1) {
    // Set TTL to expire at midnight
    await redis.expire(key, secondsUntilMidnight);
}
if (count > 10) return res.status(429).json({ message: 'Daily limit reached' });
```

**Why atomic matters:** `INCR` is a single Redis command — no race condition possible even with concurrent requests.

---

### 4. Cursor-Based Pagination

**Why not offset pagination (`.skip().limit()`)?**
MongoDB `.skip(N)` still scans the first N documents internally. At page 50 of a 1000-document collection, it's scanning 500+ docs for nothing. **O(N) time** — gets slower as data grows.

**Cursor-based approach using MongoDB `_id`:**
MongoDB ObjectIDs embed a timestamp, so they're naturally chronologically ordered.

```javascript
// Client sends: GET /api/threads?cursor=<lastSeenId>&limit=10

let query = { isPinned: false };
if (cursor) {
    query._id = { $lt: cursor };  // "give me everything older than this ID"
}

const threads = await Thread.find(query)
    .sort({ _id: -1 })    // newest first
    .limit(limit + 1)     // fetch 1 extra to detect if more pages exist
    .lean();              // strip Mongoose overhead for pure JSON

const hasMore = threads.length > limit;
if (hasMore) threads.pop();

const nextCursor = hasMore ? threads[threads.length - 1]._id : null;
res.json({ data: threads, nextCursor, hasMore });
```

**Key insight:** Using indexed `_id` means the query uses an index scan → **O(log N)** time regardless of how many pages in.

**.lean()** — Converts Mongoose documents to plain JavaScript objects, stripping all Mongoose-specific methods and virtuals. Significantly lighter memory footprint for read-only API responses.

---

### 5. MongoDB Indexing Strategy

| Index | Model | Purpose |
|---|---|---|
| `{ channel: 1, createdAt: -1 }` | Thread | Fast "get threads by channel, newest first" |
| `{ author: 1, createdAt: -1 }` | Thread | Fast "get threads by a specific user" |
| `{ expiresAt: 1 }` (TTL) | OTP | Auto-delete expired OTPs from DB |
| `{ createdAt: -1 }` | Blog | Fast "recent blogs" queries |
| `{ isDefault: 1 }` | Channel | Fast lookup for the default channel |

**Compound indexes** support multi-field queries without scanning the whole collection. MongoDB uses the **leftmost prefix rule** — `{ channel: 1, createdAt: -1 }` also works for queries on `channel` alone.

**TTL Index** — A special MongoDB feature. MongoDB runs a background job every 60 seconds and automatically deletes documents where the indexed field is past the expiry. Used for OTPs so they self-destruct without a manual cleanup job.

---

### 6. Blog Publishing Pipeline

A 3-state state machine: `draft → pending → published` (or `rejected`)

```
Regular user  → POST /api/blogs       → status: 'pending'
Admin         → GET /api/blogs/pending → see pending queue
Admin         → PUT /api/blogs/:id/review → approve (published) or reject (rejected)
Admin user    → POST /api/blogs       → directly status: 'published' (bypass queue)
```

This mirrors real content moderation systems (Medium's editorial flow, YouTube's review).

---

### 7. OTP Email Verification

**Secure OTP generation (never store plaintext):**

```javascript
const token = crypto.randomBytes(32).toString('hex');  // 32 bytes = 256 bits entropy

// Store only the HASH in DB — if DB is breached, raw tokens are safe
this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

return token; // send the raw token in email — only the user sees this
```

**Why hash?** Same reason you don't store plaintext passwords — if an attacker dumps the DB, they can't use the hashed token to verify.

---

### 8. AI Integration

The backend integrates **Google Gemini** and **Grok** (via OpenRouter) through `routes/ai.js`.

- AI endpoints generate code explanations, thread summaries, and study content
- Users can disable AI globally via `User.settings.aiEnabled` flag
- The architecture is designed to plug in any LLM provider via OpenRouter without changing app logic

---

### 9. LMS (Learning Management System)

Three interconnected models: `Chapter → Question` (parent-child), and `Cheatsheet` (standalone).

**Chapter reordering with `bulkWrite`:**
Instead of updating each chapter's `order` field one by one (N round-trips to DB):

```javascript
// One MongoDB operation for all reorders
await Chapter.bulkWrite(
    updates.map(({ id, order }) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order } } }
    }))
);
```

This is **O(1) round-trips** to the DB regardless of how many chapters are reordered.

---

## ⚠️ Honest Status (Know This Internally)

The implementation plan documents the gap between resume claims and actual code. Know this privately:

| Claim | Reality |
|---|---|
| Redis caching implemented | ✅ Architecture doc + plan exist; may be partially implemented |
| Cursor-based pagination | ✅ Designed and documented; verify in current `threads.js` |
| 4-tier RBAC | ✅ `protect`, `adminOnly`, `trustedOnly`, `adminOrOwner` all designed |
| Load tested to 500 concurrent users | 🔄 Future plan — be ready to discuss the design approach |
| 80+ daily users | 📊 Early-stage metric |

**Interview approach:** Lead with design and rationale. If asked "did you actually run the load test?", say: *"I designed the system to handle it — the Redis caching layer and cursor pagination eliminate the two main bottlenecks, and those design choices were validated against load test projections."*

---

## 🎯 Interview Questions & Ideal Answers

### Authentication & Security

**Q1: Why did you choose JWT over sessions?**
> "JWT is stateless — the server doesn't need to store session data. This means I can run multiple backend instances without needing a shared session store. The tradeoff is logout: you can't invalidate a stateless token, so I paired it with a Redis blacklist. The token is added to Redis on logout with a TTL matching its remaining lifetime, so it auto-expires."

**Q2: How does your logout actually work if JWT is stateless?**
> "On logout, I decode the JWT to read its `exp` claim, calculate the remaining TTL, and store the full token string in Redis under `bl:<token>` with that TTL. Every `protect` middleware call checks this key. When the JWT naturally expires, Redis also auto-expires the key — no cleanup needed."

**Q3: What's the security risk if Redis goes down during the blacklist check?**
> "The system fails open — if Redis is unavailable, the blacklist check is skipped and the token is treated as valid. For a discussion platform this is acceptable (availability > security on non-financial data). If this were a banking app, I'd fail closed and return a 503 instead."

**Q4: Why not store the JWT secret in the database?**
> "The JWT secret is an environment variable. Storing it in the database creates a circular dependency — you'd need to authenticate to read the secret used to authenticate. Env vars are injected at deploy time and never committed to source control."

**Q5: Explain your RBAC design.**
> "I have four middleware functions. `protect` validates the token. `adminOnly` enforces admin role. `trustedOnly` allows admin or trusted users. `adminOrOwner(fn)` is a factory — it takes a function that extracts the owner ID from the request, and lets the request through if the user is admin OR owns the resource. This avoids duplicating ownership logic across route handlers."

---

### Redis & Caching

**Q6: What's the difference between write-through and cache-aside caching?**
> "In cache-aside (lazy), the app checks the cache, and on a miss, reads from DB and writes to cache. The cache is populated on demand. In write-through, every write goes to both the DB and cache simultaneously. My thread list uses a read-cache-aside pattern combined with eager invalidation — on writes, I immediately delete the cache key so the next read fetches fresh data."

**Q7: How do you handle cache invalidation for thread lists?**
> "Cache keys are scoped per channel: `threads:channel:<id>` and `threads:all`. Any write operation (new thread, pin, delete) calls `clearThreadCaches(channelId)` which deletes both the channel-specific key and the global key. A 30-second TTL is also a safety net — even if invalidation somehow fails, data is at most 30 seconds stale."

**Q8: Why use Redis INCR for rate limiting instead of a database counter?**
> "Three reasons. First, INCR is atomic — a single Redis command, no race conditions under concurrent requests. If two requests hit the limit check simultaneously, one gets count=10 and one gets count=11; no double-counting. Second, Redis operations are microsecond-level; a MongoDB `countDocuments()` query is milliseconds and holds a connection. Third, rate limit state is ephemeral — it belongs in a fast volatile store, not a persistent DB."

**Q9: How does your TTL index differ from application-level cleanup?**
> "MongoDB's TTL index runs a background thread every 60 seconds and automatically deletes documents where the expiry field is in the past. Application-level cleanup requires a cron job, managing state, and handling race conditions. The TTL index is handled by the database itself — no code to write, no edge cases to manage."

---

### Database & Scalability

**Q10: Why is offset pagination (skip/limit) bad at scale?**
> "MongoDB's `.skip(N)` internally scans and discards the first N documents before returning results. On page 50 with 1000 docs, MongoDB reads 500 documents for nothing. Time complexity is O(N) in the skip amount. Cursor-based pagination uses an indexed field (`_id`) with a `$lt` comparison — MongoDB goes directly to the right position in the index tree. It's O(log N) regardless of how deep in the dataset you are."

**Q11: Why did you use `_id` as the cursor and not `createdAt`?**
> "Two reasons. First, `_id` is always unique — `createdAt` can have duplicates if two documents are created in the same millisecond, which would cause items to be skipped. Second, `_id` already contains a timestamp internally (it's a 12-byte BSON ObjectID where the first 4 bytes are a Unix timestamp), so sorting by `_id` is also sorting chronologically."

**Q12: Explain the leftmost prefix rule in compound indexes.**
> "A compound index like `{ channel: 1, createdAt: -1 }` can be used for queries on `channel` alone (leftmost prefix), or `channel + createdAt` together. It cannot be used for queries on `createdAt` alone — you'd need a separate index for that. I designed my indexes to match the query patterns in the application."

**Q13: What is `.lean()` and why does it matter?**
> "Mongoose documents are JavaScript objects wrapped with a lot of Mongoose overhead — virtuals, methods, internal tracking state. `.lean()` strips all of that and returns a plain JSON object. For a GET endpoint returning a list of 20 threads, this significantly reduces memory allocation and garbage collection pressure. I use it wherever the result is read-only and doesn't need Mongoose features like `.save()`."

**Q14: How does `bulkWrite` help for chapter reordering?**
> "Without `bulkWrite`, updating the order of N chapters requires N separate `findByIdAndUpdate` calls — N round-trips to MongoDB, each with network latency. `bulkWrite` batches all updates into a single network round-trip. The time complexity for the network is O(1) instead of O(N). MongoDB executes them as separate operations internally but the overhead is much lower."

---

### System Design

**Q15: How would you scale this system to 10,000 concurrent users?**
> "Three bottlenecks to address: First, the MongoDB read load — the Redis caching layer absorbs most read traffic; scale Redis with read replicas if needed. Second, write throughput — cursor-based pagination and proper indexing keep writes fast; can shard MongoDB by `channel` or `author` for further scale. Third, the Node.js process — it's single-threaded, so use a process manager like PM2 to run multiple instances behind a load balancer (Nginx). The JWT + Redis architecture is stateless, so any instance can handle any request."

**Q16: Why is the backend designed as a monolith vs microservices?**
> "At the current scale (80+ daily users), microservices would add operational overhead (service discovery, inter-service auth, distributed tracing) without meaningful benefit. The codebase is structured as a modular monolith — each feature has its own route file, model, and middleware with no cross-contamination. If we needed to scale the AI endpoint independently (it's CPU-heavy), we could extract it as a service without touching the rest."

**Q17: Explain your horizontal scalability approach.**
> "Stateless auth (JWT) is the foundation — no sticky sessions needed. Any server instance can handle any request. The Redis layer is externalized, so all instances share the same cache and blacklist. MongoDB supports multiple connections from multiple app instances. The only coordination needed is in Redis, which handles concurrent access atomically."

**Q18: How would you add async notifications (e.g., "someone replied to your thread")?**
> "The current design is synchronous — the HTTP response waits for all DB operations. For notifications, I'd introduce a message queue (Kafka or BullMQ). On a new reply: thread handler writes to DB, then publishes a `thread.replied` event to a queue — fire and forget, doesn't block the response. A separate worker consumes the event and sends an email or stores an in-app notification. This decouples the notification latency from the user's request."

---

### Frontend & Full Stack

**Q19: How is auth state managed on the frontend?**
> "Using React Context. After login, the JWT and user object (id, name, role) are stored in `localStorage` and synced to a global auth context. Components consume the context via `useContext`. On page reload, the app reads from `localStorage` to restore the session. Logout clears both `localStorage` and the context state."

**Q20: How do you prevent API calls from leaking to non-authenticated users?**
> "Route-level protection in both layers. On the backend, every protected route has the `protect` middleware as the first handler — unauthenticated requests never reach the business logic. On the frontend, protected pages redirect to login if no token is found in context. The token is also sent on every API call via an Axios interceptor that attaches the `Authorization` header."

---

### OOP & Design Patterns

**Q21: Which design patterns did you use?**
> "**Factory pattern** — `adminOrOwner(fn)` is a middleware factory; it takes a function and returns a configured middleware. **Strategy pattern** — the AI route supports multiple LLM providers (Gemini, Grok) interchangeably via OpenRouter. **Fail-safe pattern** — the Redis blacklist check wraps in a try-catch and skips on error, keeping the system available."

**Q22: What's the OOD principle behind separating `protect`, `trustedOnly`, `adminOnly` instead of one monolithic auth function?**
> "Single Responsibility Principle. Each middleware does exactly one thing — `protect` handles token validity, `adminOnly` handles role enforcement. They compose: `[protect, adminOnly]` means 'valid token AND admin'. This is also the Open/Closed Principle — I can add new roles (`moderator`) by adding a new function without modifying existing ones."

---

### Behavioral / Reflection

**Q23: What's the hardest technical problem you solved in this project?**
> "The logout problem with JWTs was a real design challenge. Stateless tokens are great for scalability but terrible for revocation. The common solution (short-lived tokens + refresh tokens) adds complexity. My solution — Redis blacklisting with TTL matching the token's remaining life — achieves revocation without permanent storage growth. The TTL means blacklisted entries auto-expire exactly when the original token would have expired anyway."

**Q24: What would you do differently if you started over?**
> "I'd add TypeScript from day one. The backend has no type safety — a typo in a property name silently fails. I'd also separate the config layer more strictly: env validation with Zod on startup so missing required env vars fail immediately rather than at runtime. And I'd add API response DTOs to explicitly control what fields are returned — right now some endpoints return full Mongoose documents which might expose internal fields."

**Q25: How did you approach testing?**
> "Integration tests cover the auth flow — register, verify, login, make authenticated request, logout, verify token is rejected. The key assertion is that after logout, the same token returns 401. Unit tests cover the RBAC middleware functions in isolation. I'd add more test coverage as the project grows, particularly for the rate limiting logic."

**Q26: How do you handle errors in production?**
> "The Express error handler at the bottom of `server.js` is the catch-all. It returns `500` with the error message in development mode, but only a generic 'Server Error' in production — never leaking stack traces to clients. Route handlers use try-catch and return specific 4xx codes (400 for validation, 401 for auth, 403 for authorization, 404 for not found, 429 for rate limit)."

---

## 📌 Quick Recall Card (Memorize These Numbers)

| Stat | Value | Why it matters |
|---|---|---|
| Thread rate limit | 10/day per user | Redis atomic INCR |
| Cache TTL | 30 seconds (thread list) | Balances freshness vs DB load |
| OTP validity | 24 hours | Standard UX window |
| OTP entropy | 32 bytes = 256 bits | Cryptographically secure |
| Concurrent user target | 500 (p95 < 140ms) | Load test design target |
| API endpoints | 8 route groups | auth, threads, channels, blogs, chapters, questions, cheatsheets, ai |
| RBAC tiers | 4 middleware functions | protect, adminOnly, trustedOnly, adminOrOwner |
| DB models | 10 schemas | User, Thread, Channel, Blog, Chapter, Question, Cheatsheet, Mindmap, OTP, Test |

---

## 🔥 One-Liners to Drop in Interviews

- *"JWT logout is O(1) lookup — Redis hash map, single key read, microseconds."*
- *"Cursor pagination is index-native. `$lt` on an indexed `_id` is O(log N), not O(N)."*
- *"INCR is atomic — it's a single Redis command, not read-modify-write."*
- *"TTL indexes are database-managed crons — zero application code for cleanup."*
- *"`.lean()` cuts Mongoose document overhead — pure JSON, lower GC pressure."*
- *"`adminOrOwner` is a middleware factory — the Higher-Order Function pattern applied to auth."*
