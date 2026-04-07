import type { EmailJob, Sender, User, SchedulePayload, ScheduleResponse } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// auth
export const getMe = () => apiFetch<User>("/api/auth/me");
export const logout = () => apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });

// emails
export const getScheduledEmails = () => apiFetch<EmailJob[]>("/api/emails/scheduled");
export const getSentEmails = () => apiFetch<EmailJob[]>("/api/emails/sent");

// schedule
export const scheduleEmails = (payload: SchedulePayload) =>
  apiFetch<ScheduleResponse>("/api/schedule", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// senders
export const getSenders = () => apiFetch<Sender[]>("/api/senders");
