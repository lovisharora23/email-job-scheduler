"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Mail, LogOut, RefreshCw, Plus, Calendar, Send, AlertCircle, Clock, Search } from "lucide-react";
import { getMe, getScheduledEmails, getSentEmails, logout } from "@/lib/api";
import type { User, EmailJob } from "@/types";
import { ComposeModal } from "@/components/ComposeModal";
import { formatDate } from "@/lib/utils";

type Tab = "scheduled" | "sent";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; dotColor: string; label: string }> = {
    scheduled: { bg: "#dbeafe", color: "#1d4ed8", dotColor: "#3b82f6", label: "Scheduled" },
    sent: { bg: "#dcfce7", color: "#15803d", dotColor: "#22c55e", label: "Sent" },
    failed: { bg: "#fee2e2", color: "#b91c1c", dotColor: "#ef4444", label: "Failed" },
    rescheduled: { bg: "#fef3c7", color: "#92400e", dotColor: "#f59e0b", label: "Rescheduled" },
  };
  const c = config[status] || config.scheduled;
  return (
    <span className="badge" style={{ background: c.bg, color: c.color }}>
      <span className="badge-dot" style={{ background: c.dotColor }} />
      {c.label}
    </span>
  );
}

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
  const [search, setSearch] = useState("");

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
      // swallow
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  const fetchSent = useCallback(async () => {
    try {
      const data = await getSentEmails();
      setSent(data);
    } catch {
      // swallow
    } finally {
      setLoadingSent(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
    fetchSent();
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

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: "#e5e7eb", borderTopColor: "#4f46e5" }} />
      </div>
    );
  }

  const currentJobs = tab === "scheduled" ? scheduled : sent;
  const filteredJobs = search
    ? currentJobs.filter(j =>
        j.toEmail.toLowerCase().includes(search.toLowerCase()) ||
        j.subject.toLowerCase().includes(search.toLowerCase())
      )
    : currentJobs;
  const loading = tab === "scheduled" ? loadingScheduled : loadingSent;

  const stats = [
    { label: "Scheduled", value: scheduled.filter(j => j.status === "scheduled").length, icon: Clock, color: "#3b82f6", bg: "#dbeafe" },
    { label: "Rescheduled", value: scheduled.filter(j => j.status === "rescheduled").length, icon: Calendar, color: "#f59e0b", bg: "#fef3c7" },
    { label: "Sent", value: sent.filter(j => j.status === "sent").length, icon: Send, color: "#22c55e", bg: "#dcfce7" },
    { label: "Failed", value: sent.filter(j => j.status === "failed").length, icon: AlertCircle, color: "#ef4444", bg: "#fee2e2" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Header */}
      <header style={{
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
            }}>
              <Mail style={{ width: 18, height: 18, color: "white" }} />
            </div>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a2e" }}>ReachInbox</span>
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              id="compose-btn"
              onClick={() => setComposeOpen(true)}
              className="btn-primary"
            >
              <Plus style={{ width: 16, height: 16 }} />
              Compose New Email
            </button>

            {/* user chip */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              paddingLeft: "16px",
              borderLeft: "1px solid #e5e7eb",
            }}>
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #e5e7eb" }}
                />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "#eef2ff", border: "2px solid #c7d2fe",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 700, color: "#4f46e5",
                }}>
                  {user.name[0]}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e" }}>{user.name}</span>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>{user.email}</span>
              </div>
              <button
                id="logout-btn"
                onClick={handleLogout}
                style={{
                  padding: "6px", background: "none", border: "none",
                  color: "#9ca3af", cursor: "pointer", borderRadius: "8px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#1a1a2e"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#9ca3af"; }}
                title="Sign out"
              >
                <LogOut style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="stat-card animate-fadeIn">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#6b7280" }}>{label}</span>
                <div style={{ width: 36, height: 36, borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon style={{ width: 18, height: 18, color }} />
                </div>
              </div>
              <span style={{ fontSize: "32px", fontWeight: 700, color: "#1a1a2e" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Email Table Card */}
        <div className="card animate-slideUp" style={{ overflow: "hidden" }}>
          {/* Tab bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            borderBottom: "1px solid #e5e7eb",
          }}>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["scheduled", "sent"] as Tab[]).map((t) => (
                <button
                  key={t}
                  id={`tab-${t}`}
                  onClick={() => setTab(t)}
                  className={`tab-btn ${tab === t ? "active" : ""}`}
                >
                  {t === "scheduled" ? "📅 Scheduled Emails" : "📤 Sent Emails"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <Search style={{ width: 14, height: 14, position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    padding: "8px 12px 8px 32px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "13px",
                    outline: "none",
                    width: "200px",
                    transition: "all 0.2s",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "#4f46e5"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <button
                onClick={handleRefresh}
                style={{
                  padding: "8px", background: "none", border: "1px solid #e5e7eb",
                  borderRadius: "8px", cursor: "pointer", color: "#6b7280",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f3f4f6"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                title="Refresh"
              >
                <RefreshCw style={{ width: 14, height: 14, ...(refreshing ? { animation: "spin 1s linear infinite" } : {}) }} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ padding: "0" }}>
            {loading ? (
              <div style={{ padding: "64px", textAlign: "center" }}>
                <div className="spinner" style={{ width: 24, height: 24, margin: "0 auto 12px", borderColor: "#e5e7eb", borderTopColor: "#4f46e5" }} />
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>Loading emails...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div style={{ padding: "64px", textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "#f3f4f6", margin: "0 auto 16px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Mail style={{ width: 24, height: 24, color: "#9ca3af" }} />
                </div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                  {search ? "No matching emails" : tab === "scheduled" ? "No scheduled emails yet" : "Nothing sent yet"}
                </p>
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>
                  {search ? "Try a different search term." : "Click \'Compose New Email\' to get started."}
                </p>
              </div>
            ) : (
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Recipient</th>
                    <th style={{ textAlign: "left" }}>Subject</th>
                    <th style={{ textAlign: "left" }}>Sender</th>
                    <th style={{ textAlign: "left" }}>{tab === "scheduled" ? "Scheduled At" : "Sent At"}</th>
                    <th style={{ textAlign: "left", width: 120 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontFamily: "monospace", fontSize: "13px", color: "#374151" }}>{job.toEmail}</td>
                      <td style={{ color: "#374151", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {job.subject}
                      </td>
                      <td style={{ fontSize: "13px", color: "#6b7280" }}>{job.sender?.email || "—"}</td>
                      <td style={{ fontSize: "13px", color: "#6b7280" }}>
                        {formatDate(tab === "scheduled" ? job.scheduledAt : job.sentAt)}
                      </td>
                      <td>
                        <StatusBadge status={job.status} />
                        {job.status === "failed" && job.error && (
                          <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={job.error}>
                            {job.error}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
