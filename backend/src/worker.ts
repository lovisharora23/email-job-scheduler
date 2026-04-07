import "dotenv/config";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import prisma from "./lib/prisma";
import { createTransporter, getPreviewUrl } from "./lib/mailer";
import { QUEUE_NAME } from "./lib/queue";

export type EmailJobPayload = {
  emailJobId: string; // DB record UUID (= BullMQ jobId)
};

// separate redis conn for the worker — BullMQ needs maxRetriesPerRequest: null
const workerRedis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// rate limit redis (same conn is fine for plain INCR/EXPIRE calls)
const rateRedis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "5");
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || "10");
const rateLimitDuration = parseInt(process.env.RATE_LIMIT_DURATION_MS || "2000");
const minDelayDelay = parseInt(process.env.MIN_DELAY_MS || "2000");
const maxEmailsPerHourGlobal = parseInt(process.env.MAX_EMAILS_PER_HOUR || "1000");
const maxEmailsPerSender = parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || "100");

async function rescheduleOverLimitJob(
  job: Job<EmailJobPayload>,
  emailJobId: string,
  senderId: string,
  overageCount: number
) {
  // figure out how long until the next hour boundary
  const now = Date.now();
  const nextHour = (Math.floor(now / 3_600_000) + 1) * 3_600_000;
  
  // Stagger rescheduled jobs so they preserve original queued order when next hour begins
  const staggerDelay = overageCount * minDelayDelay;
  const delay = nextHour - now + staggerDelay;

  const retryJobId = `${emailJobId}-retry-${job.attemptsMade}`;

  // import here to avoid circular — TODO: maybe move to separate module
  const { emailQueue } = await import("./lib/queue");
  await emailQueue.add("send-email", { emailJobId }, { delay, jobId: retryJobId });

  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: { status: "rescheduled" },
  });

  console.log(`[worker] hourly limit hit for sender ${senderId}, rescheduled to +${Math.round(delay / 60000)}min`);
}

async function markJobSent(emailJobId: string) {
  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: { status: "sent", sentAt: new Date() },
  });
}

async function markJobFailed(emailJobId: string, reason: string) {
  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: { status: "failed", error: reason },
  });
  console.error(`[worker] job ${emailJobId} failed:`, reason);
}

async function processEmail(job: Job<EmailJobPayload>) {
  const { emailJobId } = job.data;

  const emailRecord = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { sender: true },
  });

  if (!emailRecord) {
    console.warn(`[worker] email job ${emailJobId} not found in DB, skipping`);
    return;
  }

  // idempotency — job might have been processed if worker crashed mid-send
  if (emailRecord.status === "sent") {
    console.log(`[worker] ${emailJobId} already sent, skipping`);
    return;
  }

  const { sender } = emailRecord;
  const hourWindow = Math.floor(Date.now() / 3_600_000);
  const hourKey = `rate:${sender.id}:${hourWindow}`;

  // atomic increment + set expiry to next hour boundary
  const count = await rateRedis.incr(hourKey);
  if (count === 1) {
    const nextHour = (hourWindow + 1) * 3_600_000;
    const ttlSeconds = Math.ceil((nextHour - Date.now()) / 1000);
    await rateRedis.expire(hourKey, ttlSeconds);
  }

  const senderLimit = sender.hourlyLimit ?? maxEmailsPerSender;

  if (count > senderLimit) {
    await rescheduleOverLimitJob(job, emailJobId, sender.id, count - senderLimit);
    return;
  }
  
  if (count > maxEmailsPerHourGlobal) {
    await rescheduleOverLimitJob(job, emailJobId, "global", count - maxEmailsPerHourGlobal);
    return;
  }

  // actually send it
  try {
    const transporter = createTransporter({
      host: sender.smtpHost,
      port: parseInt(sender.smtpPort),
      user: sender.smtpUser,
      pass: sender.smtpPass,
    });

    const info = await transporter.sendMail({
      from: `"ReachInbox" <${sender.email}>`,
      to: emailRecord.toEmail,
      subject: emailRecord.subject,
      html: emailRecord.body,
    });

    const previewUrl = getPreviewUrl(info);
    console.log(`[worker] ✉️  sent to ${emailRecord.toEmail} — preview: ${previewUrl}`);

    await markJobSent(emailJobId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // If we've hit max attempts (configured in job options, default 3), mark as failed in DB
    const maxAttempts = job.opts.attempts || 3;
    if (job.attemptsMade >= maxAttempts) {
      await markJobFailed(emailJobId, msg);
    }
    throw err; // let BullMQ handle retry logic
  }
}

const worker = new Worker<EmailJobPayload>(QUEUE_NAME, processEmail, {
  connection: workerRedis,
  concurrency,
  limiter: {
    max: 1,
    duration: minDelayDelay,
  },
  settings: {
    backoffStrategy: (attempts: number) => {
      return Math.pow(2, attempts) * 1000;
    }
  }
});

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[worker] worker error:", err);
});

async function syncQueue() {
  // Catch ALL unprocessed jobs (future and past-due orphans)
  const pendingOpts = await prisma.emailJob.findMany({
    where: { status: "scheduled" }
  });
  
  if (pendingOpts.length > 0) {
    // Need queue to check BullMQ jobs
    const { emailQueue } = await import("./lib/queue");
    
    for (const job of pendingOpts) {
      const bullJob = await emailQueue.getJob(job.jobId);
      if (!bullJob) {
        console.log(`[worker] recovering orphaned DB job ${job.id}`);
        const delay = Math.max(job.scheduledAt.getTime() - Date.now(), 0);
        await emailQueue.add("send-email", { emailJobId: job.id }, { delay, jobId: job.jobId });
      }
    }
  }
}

syncQueue().then(() => {
  console.log(`[worker] started — concurrency: ${concurrency}, rate: ${rateLimitMax}/${rateLimitDuration}ms`);
});
