"use client";

import { EmailJob } from "@/types";
import { Badge } from "./Badge";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { formatDate } from "@/lib/utils";

interface EmailTableProps {
  jobs: EmailJob[];
  loading: boolean;
  type: "scheduled" | "sent";
}

export function EmailTable({ jobs, loading, type }: EmailTableProps) {
  if (loading) return <LoadingSkeleton rows={6} />;

  if (jobs.length === 0) {
    return type === "scheduled" ? (
      <EmptyState
        title="No scheduled emails yet"
        description="Click 'Compose New Email' to schedule your first campaign."
      />
    ) : (
      <EmptyState
        title="Nothing sent yet"
        description="Sent and failed emails will appear here once the worker processes them."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
            <th className="text-left pb-3 pl-2 font-medium">To</th>
            <th className="text-left pb-3 font-medium">Subject</th>
            <th className="text-left pb-3 font-medium">
              {type === "scheduled" ? "Scheduled At" : "Sent At"}
            </th>
            <th className="text-left pb-3 font-medium w-28">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-white/3 transition-colors group">
              <td className="py-3 pl-2 text-white/80 font-mono text-xs">{job.toEmail}</td>
              <td className="py-3 text-white/70 max-w-[200px] truncate">{job.subject}</td>
              <td className="py-3 text-white/50 text-xs">
                {formatDate(type === "scheduled" ? job.scheduledAt : job.sentAt)}
              </td>
              <td className="py-3">
                <Badge status={job.status} />
                {job.status === "failed" && job.error && (
                  <div className="text-[10px] text-red-400 mt-1 max-w-[120px] truncate" title={job.error}>
                    {job.error}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
