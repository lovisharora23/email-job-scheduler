"use client";

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-4 py-3 rounded-lg bg-white/5">
          <div className="h-3 bg-white/10 rounded w-40" />
          <div className="h-3 bg-white/10 rounded w-56 flex-1" />
          <div className="h-3 bg-white/10 rounded w-28" />
          <div className="h-5 bg-white/10 rounded-full w-20" />
        </div>
      ))}
    </div>
  );
}
