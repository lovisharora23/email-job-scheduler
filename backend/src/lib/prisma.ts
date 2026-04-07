import { PrismaClient } from "@prisma/client";

// single instance for the whole process
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
});

export default prisma;
