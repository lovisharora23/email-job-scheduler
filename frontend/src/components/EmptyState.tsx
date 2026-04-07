"use client";

import { Mail } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <Mail className="w-7 h-7 text-white/30" />
      </div>
      <div>
        <p className="text-white/70 font-medium">{title}</p>
        <p className="text-white/35 text-sm mt-1">{description}</p>
      </div>
    </div>
  );
}
