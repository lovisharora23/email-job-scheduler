import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import prisma from "../lib/prisma";
import { emailQueue } from "../lib/queue";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const {
    emails,
    subject,
    body,
    senderId,
    startAt,
    delayBetweenEmails, // in seconds
    hourlyLimit,
  } = req.body as {
    emails: string[];
    subject: string;
    body: string;
    senderId: string;
    startAt: string;
    delayBetweenEmails: number;
    hourlyLimit: number;
  };

  if (!emails?.length || !subject || !body || !senderId || !startAt) {
    res.status(400).json({ error: "missing required fields" });
    return;
  }

  // make sure the sender exists
  const sender = await prisma.sender.findUnique({ where: { id: senderId } });
  if (!sender) {
    res.status(404).json({ error: "sender not found" });
    return;
  }

  // optionally update hourly limit if caller passes a different value
  if (hourlyLimit && hourlyLimit !== sender.hourlyLimit) {
    await prisma.sender.update({
      where: { id: senderId },
      data: { hourlyLimit },
    });
  }

  const startMs = new Date(startAt).getTime();
  const delayMs = (delayBetweenEmails || 0) * 1000;
  const createdJobs: string[] = [];

  for (let i = 0; i < emails.length; i++) {
    const id = uuidv4();
    const scheduledAt = new Date(startMs + i * delayMs);
    const jobDelay = scheduledAt.getTime() - Date.now();

    // create the DB record first so the worker can look it up
    await prisma.emailJob.create({
      data: {
        id,
        toEmail: emails[i],
        subject,
        body,
        senderId,
        scheduledAt,
        status: "scheduled",
        jobId: id,
      },
    });

    // enqueue with jobId = DB uuid for idempotency — BullMQ won't add a duplicate
    await emailQueue.add(
      "send-email",
      { emailJobId: id },
      { delay: Math.max(jobDelay, 0), jobId: id }
    );

    createdJobs.push(id);
  }

  res.json({ created: createdJobs.length, jobIds: createdJobs });
});

export default router;
