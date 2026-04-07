"use client";

import { cn } from "@/lib/utils";
import { type EmailStatus } from "@/types";

const styles: Record<EmailStatus, string> = {
  scheduled: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  rescheduled: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  sent: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border border-red-500/30",
};

export function Badge({ status }: { status: EmailStatus }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", styles[status])}>
      {status}
    </span>
  );
}
