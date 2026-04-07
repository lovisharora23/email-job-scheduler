# ReachInbox Scheduler

A production-grade email job scheduler powered by BullMQ, PostgreSQL, and Express, with a Next.js (App Router) frontend.

## Architecture & Design Decisions

I went with **BullMQ** here instead of basic cron jobs because you explicitly need idempotency, persistence across server crashes, and robust rate limiting for external APIs.
- **Scheduling**: BullMQ delayed jobs are stored directly in Redis. When you schedule an email for tomorrow, the job sits in Redis and effortlessly survives server restarts. No in-memory `setTimeout` or `setInterval` nonsense.
- **Persistence**: A PostgreSQL database (via Prisma) stores the canonical state of all jobs (`scheduled`, `sent`, `failed`, `rescheduled`). The trick to idempotency here is that the BullMQ `jobId` exactly matches the `email_job.id` UUID in Postgres. If the worker crashes mid-send and restarts, BullMQ might retry the job, but the payload `jobId` guarantees we can check the database first to see if it actually sent.
- **Rate limiting**: I used a Redis tracking key pattern (`rate:{senderId}:{currentHourWindow}`) and `INCR`. If a sender hits the limit, we don't drop the work — we reschedule the job with a `delay` pushing it into the *next* hour bucket.
- **Concurrency**: `WORKER_CONCURRENCY` handles standard BullMQ parallel processing.

## 🚀 Technical Feature Mapping

| Component | Backend / Infrastructure | Frontend / UI |
|---|---|---|
| **Authentication** | Passport.js + Google OAuth 2.0 | Protected Routes + Google Login |
| **Email Scheduling** | **BullMQ** (Redis-backed delayed jobs) | **Datetime Picker** + JSON payloads |
| **Bulk Processing** | **Node.js Parsing** (Email Regex Validation) | Client-side **CSV Detection Count** |
| **Persistence** | **PostgreSQL 15** + Prisma ORM | Real-time **Job Status Badges** |
| **Rate Limiting** | **Atomic Redis Counters** (per sender/hour) | Feedback on rescheduled jobs |
| **Throughput Control** | BullMQ **Limiter** (enforces `MIN_DELAY_MS`) | User-defined delay configuration |
| **Error Handling** | Try/Catch + **Database Error Logging** | Failed status UI + **Error Message display** |
| **Orphan Recovery** | **syncQueue()** (Resyncs DB to Redis on boot) | Data consistency across worker crashes |
| **SMTP Delivery** | Nodemailer Integration | Status tracking from "Scheduled" to "Sent" |

## 1. Setup Infra (PostgreSQL + Redis)

Just run Docker Compose to bring up Postgres 15 and Redis 7 (with AOF persistence configured!).

```bash
docker-compose up -d
```

## 2. Backend Setup
```bash
cd backend

# install deps
npm install

# Set up the database (runs Prisma migrations)
npm run db:migrate
```

*Note: The first time you start the server, if you don't have `ETHEREAL_USER` and `ETHEREAL_PASS` in your `.env`, the server will auto-create a test account for you and print the credentials to the console. You can either copy them into your `.env` or just let it recreate one next time.*

Start the backend API and Worker:
```bash
# starts the Express API server on port 4000
npm run dev

# IN A NEW TERMINAL, start the BullMQ worker
npm run worker
```

## 3. Frontend Setup

In another terminal window:

```bash
cd frontend

# In case you skipped it
npm install

# Start the Next.js app on port 3000
npm run dev
```

## 4. Environment Variables

Here's what each ENV means (you can use defaults for most or copy the existing `.env.example`/`.env` files):

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `WORKER_CONCURRENCY` | Max jobs processed simultaneously by worker (default: 5) |
| `RATE_LIMIT_MAX` | Max jobs handled per duration by BullMQ (default: 10) |
| `RATE_LIMIT_DURATION_MS` | Duration for BullMQ limiter (default: 2000 ms) |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | The callback URL, e.g. `http://localhost:4000/api/auth/google/callback` |
| `FRONTEND_URL` | Used for CORS and redirects, e.g., `http://localhost:3000` |
| `SESSION_SECRET` | Secret for express-session |
| `ETHEREAL_USER` | Valid test email account auto-created if blank |
| `ETHEREAL_PASS` | Valid test email password auto-created if blank |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Points to the backend, e.g., `http://localhost:4000` |

## Demo Script
Here is how to test it out:
1. Hit `http://localhost:3000/login` and log in via Google.
2. (Optional but needed to send) Go to the database and insert a row into `Sender` with your Ethereal creds (the backend needs an endpoint to create them via API, normally you'd build a settings page, but you can POST to `http://localhost:4000/api/senders` with `email`, `smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`).
3. Click "Compose New Email".
4. Upload a small `.txt` file containing 3 email addresses separated by commas.
5. Set the Start Time to 1 minute from now, with a delay of 5 seconds between each. Set hourly limit low to watch rate limiting if desired.
6. Check the "Scheduled Emails" tab. Watch the worker logs. They will show sending, and the tab will update automatically.
