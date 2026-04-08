import "dotenv/config";
import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import { createClient } from "redis";
import RedisStore from "connect-redis";

import authRouter, { setupPassport } from "./routes/auth";
import scheduleRouter from "./routes/schedule";
import emailsRouter from "./routes/emails";
import sendersRouter from "./routes/senders";
import { createEtherealAccount } from "./lib/mailer";

import prisma from "./lib/prisma";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// session store backed by Redis so sessions survive restarts
const redisClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
redisClient.connect().catch(console.error);

app.set("trust proxy", 1);

app.use(
  session({
    store: new RedisStore({ client: redisClient, ttl: 86400 }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  })
);

setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// routes
app.use("/api/auth", authRouter);
app.use("/api/schedule", scheduleRouter);
app.use("/api/emails", emailsRouter);
app.use("/api/senders", sendersRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

async function ensureDefaultSender() {
  // Check if any sender exists already
  const existingCount = await prisma.sender.count();
  if (existingCount > 0) {
    console.log("📧 Sender(s) already configured — skipping Ethereal setup.");
    return;
  }

  // Create an Ethereal test account and register it as a sender
  const account = await createEtherealAccount();
  await prisma.sender.create({
    data: {
      email: account.user,
      smtpHost: account.smtp.host,
      smtpPort: String(account.smtp.port),
      smtpUser: account.user,
      smtpPass: account.pass,
      hourlyLimit: 100,
    },
  });
  console.log(`✅ Default Ethereal sender registered: ${account.user}`);
}

async function start() {
  await ensureDefaultSender();

  app.listen(PORT, () => {
    console.log(`🚀 ReachInbox API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("failed to start server:", err);
  process.exit(1);
});
