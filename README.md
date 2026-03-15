# CreatorLink — Full-Stack Platform

## 🏗️ Architecture Overview

```
creatorlink/
├── frontend/               Next.js 14 + TypeScript + Tailwind CSS
│   ├── app/
│   │   ├── page.tsx                   Home page
│   │   ├── auth/login/                Login page
│   │   ├── auth/register/             Register page
│   │   ├── auth/callback/             OAuth callback
│   │   ├── auth/verify-email/         Email verification
│   │   ├── auth/forgot-password/      Password reset request
│   │   ├── auth/reset-password/       Password reset form
│   │   ├── dashboard/                 User dashboard
│   │   ├── profile/[username]/        Creator public profile
│   │   ├── search/creators/           Creator search + filters
│   │   ├── search/projects/           Project search
│   │   ├── projects/[slug]/           Project detail + apply
│   │   ├── projects/new/              Create project (client)
│   │   ├── messages/                  Real-time messaging
│   │   ├── settings/                  Account settings
│   │   ├── admin/                     Admin panel
│   │   └── legal/                     Terms, Privacy pages
│   ├── components/
│   │   ├── layout/Navbar.tsx
│   │   ├── layout/Footer.tsx
│   │   └── profile/ProfileActions.tsx
│   └── lib/
│       ├── api.ts                     Axios client + all API helpers
│       ├── auth.tsx                   Auth context + provider
│       └── types.ts                   TypeScript types
│
├── backend/                Node.js + Express + TypeScript
│   └── src/
│       ├── index.ts                   App entry + Socket.IO setup
│       ├── routes/
│       │   ├── auth.ts                Register, login, OAuth, reset
│       │   ├── users.ts               Profile CRUD, skills, portfolio
│       │   ├── projects.ts            Project CRUD
│       │   ├── applications.ts        Apply, review, accept/reject
│       │   ├── messages.ts            Conversations + messages REST
│       │   ├── reviews.ts             Review CRUD
│       │   ├── notifications.ts       Notifications
│       │   ├── search.ts              Creator + project search
│       │   ├── uploads.ts             File uploads (avatar, banner)
│       │   └── admin.ts               Admin panel API
│       ├── controllers/               Business logic
│       ├── middleware/
│       │   ├── auth.ts                JWT authentication
│       │   ├── validate.ts            express-validator
│       │   └── errorHandler.ts        Global error handling
│       ├── socket/handlers.ts         Socket.IO real-time messaging
│       ├── config/passport.ts         Google OAuth strategy
│       ├── db/
│       │   ├── connection.ts          pg Pool + query helpers
│       │   └── schema.sql             Full PostgreSQL schema
│       └── utils/
│           ├── logger.ts              Winston logger
│           ├── email.ts               Nodemailer + templates
│           └── notifications.ts      Push notifications utility
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis (optional, for session blocklist)

### 1. Clone and install dependencies

```bash
git clone https://github.com/you/creatorlink.git
cd creatorlink

# Backend
cd backend
cp .env.example .env
npm install

# Frontend
cd ../frontend
cp .env.local.example .env.local
npm install
```

### 2. Set up the database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE creatorlink;"

# Run schema
psql -U postgres -d creatorlink -f backend/src/db/schema.sql
```

### 3. Configure environment variables

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/creatorlink
JWT_SECRET=your-very-long-random-secret-32-chars-minimum
JWT_REFRESH_SECRET=different-very-long-random-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.mailtrap.io
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
```

### 4. Start development servers

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/health

---

## 🐳 Docker (Recommended)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values

docker-compose up --build
```

---

## ☁️ Production Deployment

### Frontend → Vercel
```bash
cd frontend
vercel --prod
# Set env vars in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://api.creatorlink.io/api
# NEXT_PUBLIC_SOCKET_URL=https://api.creatorlink.io
```

### Backend → Railway
```bash
# 1. Create a Railway project
# 2. Connect your GitHub repo
# 3. Set the root directory to /backend
# 4. Add environment variables in Railway dashboard
# 5. Railway auto-deploys on push to main
```

### Database → Railway PostgreSQL or Supabase
```bash
# Railway: Add PostgreSQL service, copy DATABASE_URL
# Supabase: Create project, use connection pooler URL

# Run schema after setup:
psql $DATABASE_URL -f backend/src/db/schema.sql
```

### Google OAuth Setup
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable "Google+ API" and "Google Identity"
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/google/callback` (dev)
   - `https://api.creatorlink.io/api/auth/google/callback` (prod)
6. Copy Client ID and Secret to `.env`

### Email Setup (Recommended: Resend or Brevo)
```env
# Resend
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_your_api_key

# Brevo (free 300/day)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-brevo-smtp-key
```

---

## 🔒 Security Checklist

- [x] bcrypt password hashing (cost factor 12)
- [x] JWT access tokens (15min) + refresh tokens (7d)
- [x] Rate limiting on auth endpoints (10 req/15min)
- [x] Global rate limit (200 req/15min per IP)
- [x] Helmet.js security headers
- [x] CORS configured to allowed origins only
- [x] Input validation on all endpoints (express-validator)
- [x] SQL injection prevention (parameterized queries)
- [x] File upload type validation + sharp processing
- [x] Email verification required
- [x] Password reset tokens expire in 1 hour
- [x] Soft-delete accounts (GDPR)
- [x] Admin audit log

---

## 📊 Database Triggers

The schema includes automatic triggers for:
- `updated_at` auto-update on all main tables
- User `avg_rating` and `total_reviews` recalculation on review insert/update
- `applications_count` increment/decrement on project

---

## 🌐 API Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/auth/google | Google OAuth |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/refresh | Refresh tokens |
| GET | /api/search/creators | Search creators |
| GET | /api/search/projects | Search projects |
| GET | /api/users/:username | Public profile |
| PUT | /api/users/me/profile | Update profile |
| PUT | /api/users/me/social-links | Update socials |
| PUT | /api/users/me/skills | Update skills |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:slug | Get project |
| POST | /api/applications | Apply to project |
| GET | /api/messages | List conversations |
| POST | /api/messages | Start conversation |
| POST | /api/messages/:id | Send message |
| GET | /api/reviews/user/:username | Get user reviews |
| POST | /api/reviews | Submit review |
| GET | /api/notifications | Get notifications |
| GET | /api/admin/stats | Admin dashboard |
| GET | /api/admin/users | Manage users |
| GET | /api/admin/reports | Manage reports |

---

## 🔌 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| join_conversation | Client → Server | Join a chat room |
| leave_conversation | Client → Server | Leave a chat room |
| send_message | Client → Server | Send a message |
| typing_start | Client → Server | Start typing |
| typing_stop | Client → Server | Stop typing |
| mark_read | Client → Server | Mark messages read |
| new_message | Server → Client | Receive message |
| user_typing | Server → Client | Typing indicator |
| notification | Server → Client | Push notification |
| messages_read | Server → Client | Read receipt |
