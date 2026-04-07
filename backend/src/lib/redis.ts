import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // required for BullMQ
});

// separate connection for BullMQ (it needs its own)
export const bullConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => console.error("[redis] connection error:", err));
