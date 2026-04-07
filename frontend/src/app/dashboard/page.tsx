"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Mail, LogOut, RefreshCw, Plus } from "lucide-react";
import { getMe, getScheduledEmails, getSentEmails, logout } from "@/lib/api";
import type { User, EmailJob } from "@/types";
import { EmailTable } from "@/components/EmailTable";
import { ComposeModal } from "@/components/ComposeModal";
import { Button } from "@/components/Button";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("scheduled");
  const [scheduled, setScheduled] = useState<EmailJob[]>([]);
  const [sent, setSent] = useState<EmailJob[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchScheduled = useCallback(async () => {
    try {
      const data = await getScheduledEmails();
      setScheduled(data);
    } catch {
      // swallow — might just not be authed yet
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  const fetchSent = useCallback(async () => {
    try {
      const data = await getSentEmails();
      setSent(data);
    } catch {
      // same
    } finally {
      setLoadingSent(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
    fetchSent();

    // poll every 10 seconds so the table auto-updates as jobs run
    const interval = setInterval(() => {
      fetchScheduled();
      fetchSent();
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchScheduled, fetchSent]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchScheduled(), fetchSent()]);
    setRefreshing(false);
    toast.success("Refreshed");
  }

  async function handleLogout() {
    await logout().catch(() => {});
    router.push("/login");
  }

  // show nothing while checking auth
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a10] flex flex-col">
      {/* header */}
      <header className="border-b border-white/8 bg-[#0a0a10]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Mail className="text-white" style={{ width: 16, height: 16 }} />
            </div>
            <span className="font-bold text-white text-base tracking-tight">ReachInbox</span>
          </div>

          {/* right side */}
          <div className="flex items-center gap-3">
            <Button
              id="compose-btn"
              onClick={() => setComposeOpen(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus style={{ width: 14, height: 14 }} />
              Compose New Email
            </Button>

            {/* user chip */}
            <div className="flex items-center gap-2 pl-3 border-l border-white/10">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-7 h-7 rounded-full border border-white/15"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-500/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                  {user.name[0]}
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-white leading-none">{user.name}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{user.email}</p>
              </div>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="p-1.5 text-white/35 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Scheduled", value: scheduled.filter(j => j.status === "scheduled").length, color: "text-blue-400" },
            { label: "Rescheduled", value: scheduled.filter(j => j.status === "rescheduled").length, color: "text-amber-400" },
            { label: "Sent", value: sent.filter(j => j.status === "sent").length, color: "text-emerald-400" },
            { label: "Failed", value: sent.filter(j => j.status === "failed").length, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="glow-card px-4 py-3">
              <p className="text-xs text-white/40 font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* tab panel */}
        <div className="glow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-0 border-b border-white/8">
            <div className="flex gap-1">
              {(["scheduled", "sent"] as Tab[]).map((t) => (
                <button
                  key={t}
                  id={`tab-${t}`}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize transition-colors ${
                    tab === t
                      ? "text-white border-b-2 border-indigo-500 -mb-px"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {t === "scheduled" ? "Scheduled Emails" : "Sent Emails"}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              className="p-1.5 text-white/30 hover:text-white hover:bg-white/8 rounded-lg transition-colors mb-1"
              title="Refresh"
            >
              <RefreshCw style={{ width: 14, height: 14 }} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="p-5">
            {tab === "scheduled" ? (
              <EmailTable jobs={scheduled} loading={loadingScheduled} type="scheduled" />
            ) : (
              <EmailTable jobs={sent} loading={loadingSent} type="sent" />
            )}
          </div>
        </div>
      </main>

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={() => {
          fetchScheduled();
          setTab("scheduled");
        }}
      />
    </div>
  );
}
