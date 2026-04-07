import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// List all senders
router.get("/", async (_req: Request, res: Response) => {
  const senders = await prisma.sender.findMany({
    select: { id: true, email: true, hourlyLimit: true },
  });
  res.json(senders);
});

// Create a sender (used during onboarding/setup)
router.post("/", async (req: Request, res: Response) => {
  const { email, smtpHost, smtpPort, smtpUser, smtpPass, hourlyLimit } = req.body;

  if (!email || !smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    res.status(400).json({ error: "missing smtp fields" });
    return;
  }

  const sender = await prisma.sender.create({
    data: {
      email,
      smtpHost,
      smtpPort: String(smtpPort),
      smtpUser,
      smtpPass,
      hourlyLimit: hourlyLimit ?? 100,
    },
  });

  res.json(sender);
});

export default router;
