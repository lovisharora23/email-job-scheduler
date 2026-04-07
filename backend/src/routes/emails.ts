import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get("/scheduled", async (_req: Request, res: Response) => {
  const jobs = await prisma.emailJob.findMany({
    where: { status: { in: ["scheduled", "rescheduled"] } },
    orderBy: { scheduledAt: "asc" },
    include: { sender: { select: { email: true } } },
  });
  res.json(jobs);
});

router.get("/sent", async (_req: Request, res: Response) => {
  const jobs = await prisma.emailJob.findMany({
    where: { status: { in: ["sent", "failed"] } },
    orderBy: { sentAt: "desc" },
    include: { sender: { select: { email: true } } },
  });
  res.json(jobs);
});

export default router;
