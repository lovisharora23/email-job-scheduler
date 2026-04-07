export type EmailStatus = "scheduled" | "sent" | "failed" | "rescheduled";

export interface EmailJob {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  senderId: string;
  sender?: { email: string };
  scheduledAt: string;
  status: EmailStatus;
  error?: string;
  sentAt: string | null;
  jobId: string;
  createdAt: string;
}

export interface Sender {
  id: string;
  email: string;
  hourlyLimit: number;
}

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface SchedulePayload {
  emails: string[];
  subject: string;
  body: string;
  senderId: string;
  startAt: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

export interface ScheduleResponse {
  created: number;
  jobIds: string[];
}
