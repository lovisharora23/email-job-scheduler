import { Queue } from "bullmq";
import { bullConnection } from "./redis";

export const QUEUE_NAME = "email-queue";

// single queue instance, shared between routes and worker startup
export const emailQueue = new Queue(QUEUE_NAME, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 1000,
    removeOnFail: 500,
  },
});
