# 📚 DotCoder — Project Walkthrough

> A full-stack coding notebook and study platform. This document explains **what is built** and **how it works** — concisely, module by module.

---

## 🏗️ Architecture at a Glance

```
dot_coder_notebook/
├── backend/          ← Node.js + Express REST API
│   ├── models/       ← MongoDB schemas (Mongoose)
│   ├── routes/       ← API route handlers
│   ├── middleware/   ← JWT auth, admin guards
│   ├── config/       ← DB + Redis config
│   └── server.js     ← Entry point
└── frontend/         ← React (Vite) SPA
    └── src/
        ├── pages/    ← Route-level views
        ├── components/ ← Reusable UI components
        ├── context/  ← Global state (Auth)
        └── App.jsx   ← Router + route guards
```

**Stack:** React + Vite (frontend) · Express.js (backend) · MongoDB + Mongoose (database) · Redis (token blacklist) · Groq AI (`llama-3.3-70b-versatile`)

---

## 🔐 1. Authentication System

**Files:** `backend/routes/auth.js`, `backend/middleware/auth.js`, `backend/models/User.js`, `frontend/src/context/AuthContext.jsx`

### How it works

| Step | What happens |
|------|-------------|
| **Register** | User submits name/email/password → password bcrypt-hashed → user saved → OTP email verification token generated (`crypto.randomBytes`) |
| **Email Verify** | User visits `/verify-email` → calls `GET /api/auth/verify/:token` → token SHA-256 matched in DB → `emailVerified: true` |
| **Login (local)** | `POST /api/auth/login` → bcrypt.compare → JWT signed with `JWT_SECRET` → returned to client |
| **Login (Google)** | Frontend uses Google OAuth flow → `handleGoogleSuccess` posts Google token to `POST /api/auth/google` → user upserted with `authProvider: 'google'` |
| **Logout** | JWT added to Redis blacklist key `bl:<token>` → subsequent requests with that token are rejected |

### Auth Middleware (`protect`)

Every protected route runs this chain:

```
Request → check Authorization header → check Redis blacklist → jwt.verify → attach req.user → next()
```

- **Fail-open on Redis:** If Redis is unavailable, blacklist check is skipped (logged) so the app stays up.

### Role System

Three roles on `User.role`:

| Role | Access |
|------|--------|
| `user` | All standard protected routes |
| `trusted` | Can write/publish blogs |
| `admin` | Full access including admin panel + blog management |

Enforced by: `protect` → `adminOnly` / `trustedOnly` / `adminOrOwner(ownerIdFn)` middleware chain.

### Frontend State — `AuthContext`

`AuthProvider` wraps the entire app. It holds `user`, `token`, `isAuthenticated`, and exposes `login()` / `logout()`. Token is persisted in `localStorage`. `ProtectedRoute` and `PublicRoute` in `App.jsx` use `useAuth()` to gate every route.

---

## 📖 2. Chapter & Question System (Core Notebook)

**Files:** `backend/routes/chapters.js`, `backend/routes/questions.js`, `backend/models/Chapter.js`, `backend/models/Question.js`

### Data Model

```
Chapter
  ├── title, description
  ├── user (owner ref)
  └── order (sort position)

Question
  ├── title
  ├── chapter (ref → Chapter)
  ├── user (owner ref)
  ├── logic: { content }   ← rich-text explanation (HTML)
  ├── code: { content }    ← raw code snippet
  ├── tags: [String]       ← AI-extracted concept tags (e.g. "arrays", "dp")
  └── order
```

### Flow

1. User creates a **Chapter** (`POST /api/chapters`) — a logical study topic.
2. Within each chapter, they add **Questions** (`POST /api/questions`) with:
   - A **logic** section (rich-text explanation of approach)
   - A **code** section (actual solution code)
3. `ChapterDetail` page renders all questions for a chapter.
4. Questions can be reordered. Tags can be auto-extracted by AI (see AI section).

---

## 🤖 3. AI Features (Groq / `llama-3.3-70b-versatile`)

**File:** `backend/routes/ai.js` — one `AIProvider` class wrapping all Groq calls.

### 3.1 Mindmap Generation

**Route:** `POST /api/ai/mindmap`

1. Fetches all questions from the chapter (title + logic + code).
2. Sends combined content to Groq with a structured JSON prompt.
3. AI returns `{ nodes, edges }` in a radial layout format.
4. Saves to `Mindmap` model (replaces old one).
5. Frontend `MindmapViewer` renders it as an interactive canvas.

**Fallback:** If AI fails, `extractTopicsManually()` derives nodes from word frequency.

### 3.2 AI Test Generation

**Route:** `POST /api/ai/test`

1. Reads chapter content + existing concept tags.
2. Asks Groq to generate `N` practice questions with: question text, solution, solution code, difficulty, LeetCode/HackerRank source URLs, and tags.
3. Deletes old test for that chapter, saves new `Test` document.
4. Frontend `Test` component lets user mark questions complete — score tracked in `test.score`.

### 3.3 AI Study Guide (Chat)

**Route:** `POST /api/ai/guide`

Context-aware Q&A — user asks a question, chapter content is injected as context, AI answers in markdown.

### 3.4 AI Suggestions

**Route:** `POST /api/ai/suggestions`

Returns 3–5 structured suggestions (`enhancement` / `topic` / `tip`) to improve study notes.

### 3.5 Concept Tag Extraction

**Routes:** `POST /api/ai/extract-tags` (single), `POST /api/ai/auto-tag-chapter` (bulk)

- Sends code + logic to Groq.
- AI returns 3–5 LeetCode-style tags (e.g. `["string", "hash-table", "greedy"]`).
- Tags are saved back to the `Question` document.
- Retries up to 2 times; throws if both fail (no silent bad fallbacks).

---

## 📝 4. Blog System

**Files:** `backend/routes/blogs.js`, `backend/models/Blog.js`, `frontend/src/pages/Blog/`

### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/blogs` | `Blogs.jsx` | Lists all published blogs (public feed) |
| `/blogs/:id` | `BlogDetail.jsx` | Full blog view + delete (owner/admin) |
| `/blogs/write` | `WriteBlog.jsx` | Rich-text editor, tag parsing (`parseTags`), create/edit |
| `/admin/blogs` | `AdminBlogs.jsx` | Admin-only: view all blogs, approve/reject |

### How it works

- `WriteBlog` → `handleSave` → `POST /api/blogs` — submits title, content, and tags.
- Tags are parsed from a comma-separated input by `parseTags`.
- Only `trusted` or `admin` users can publish blogs (enforced server-side via `trustedOnly`).
- Admin panel (`AdminBlogs`) fetches all blogs and can manage status.

---

## 💬 5. Discussion System (Threads & Channels)

**Files:** `backend/routes/threads.js`, `backend/routes/channels.js`, `backend/models/Thread.js`, `backend/models/Channel.js`

### Structure

```
Channel (e.g. "General", "DSA Help")
  └── Thread (a post/question)
       └── Replies (nested comments)
```

### Flow

1. **Discussion page** (`/discussion`) fetches all channels + threads.
2. Clicking a thread → `ThreadDetail` (`/discussion/:id`) shows full thread + replies.
3. `handleThreadClick` navigates to the detail view.
4. Users can post new threads or reply. Owner/admin can delete.

---

## 📋 6. Cheatsheets

**Files:** `backend/routes/cheatsheets.js`, `backend/models/Cheatsheet.js`, `frontend/src/pages/Cheatsheets/`

Quick-reference cards per user. Each cheatsheet has a title + content body.

- `handleCreateCheatsheet` → `POST /api/cheatsheets`
- `handleDeleteCheatsheet` → `DELETE /api/cheatsheets/:id`
- Protected by `protect` middleware + ownership check.
- Displayed in a card grid on `/cheatsheets`.

---

## ⚙️ 7. Settings Page

**File:** `frontend/src/pages/Settings/Settings.jsx`

Lets users update:
- Profile info (name, email)
- Password (local auth only)
- Preferences: `aiEnabled`, `mindmapEnabled`, `suggestionsEnabled`, `theme` (dark/light)

`Settings → UpdateSettings` is one of the 5 tracked execution flows. It PATCHes `/api/auth/settings` and refreshes the user context.

---

## 🧭 8. Routing & Navigation

### `App.jsx` Route Map

```
Public  → /login, /register, /verify-email
Protected (all behind ProtectedRoute):
  /                  → Home
  /chapter/:id       → ChapterDetail
  /cheatsheets       → Cheatsheets
  /discussion        → Discussion
  /discussion/:id    → ThreadDetail
  /settings          → Settings
  /blogs             → Blogs
  /blogs/write       → WriteBlog
  /blogs/:id         → BlogDetail
  /admin/blogs       → AdminBlogs (admin role enforced)
```

- `PublicRoute` redirects logged-in users away from auth pages.
- `ProtectedRoute` redirects unauthenticated users to `/login`.
- `AppLayout` wraps all protected pages with the `Navbar`.

---

## 🚀 9. Server & Deployment

**Entry:** `backend/server.js`

- Express app with `cors` (allows `localhost:5173`, `localhost:3000`, `FRONTEND_URL`)
- All routes mounted under `/api/*`
- In `production`, serves the built Vite frontend via `serveFrontend` middleware (single-server deployment)
- `Procfile` present → hosted on a PaaS (e.g. DigitalOcean App Platform)
- `prisma/` directory present — Prisma ORM scaffolded alongside Mongoose (likely for future SQL migration or mixed use)

---

## 🗃️ 10. Data Models Summary

| Model | Key Fields |
|-------|-----------|
| `User` | `name`, `email`, `password` (hashed), `role`, `emailVerified`, `authProvider`, `googleId`, `settings` |
| `Chapter` | `title`, `description`, `user`, `order` |
| `Question` | `title`, `logic`, `code`, `tags`, `chapter`, `user` |
| `Cheatsheet` | `title`, `content`, `user` |
| `Mindmap` | `nodes`, `edges`, `chapter`, `user`, `rawData` |
| `Test` | `questions[]`, `score`, `status`, `chapter`, `user` |
| `Blog` | `title`, `content`, `tags`, `author`, `status` |
| `Thread` | `title`, `content`, `channel`, `author`, `replies[]` |
| `Channel` | `name`, `description` |
| `OTP` | `email`, `otp`, `expiresAt` |

---

## 📊 Execution Flows (GitNexus Tracked)

| Flow | Description |
|------|-------------|
| `AdminBlogs → FetchBlogs` | Admin panel fetches all blogs with status |
| `WriteBlog → ParseTags` | Blog editor saves post with parsed tag array |
| `VerifyEmail → RefreshUser` | OTP verify → updates auth context user state |
| `Settings → UpdateSettings` | Settings form PATCHes user prefs + refreshes context |
| `MindmapViewer → FormatMindmapData` | Fetches mindmap, formats nodes for canvas render |

---

*Generated by Antigravity · Last updated: 2026-08-23*
