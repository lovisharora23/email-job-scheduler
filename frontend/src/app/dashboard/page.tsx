"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Clock, Send, Search, RefreshCw, Filter, Star, ArrowLeft,
  ChevronDown, Paperclip, X, Upload, LogOut
} from "lucide-react";
import { getMe, getScheduledEmails, getSentEmails, logout, getSenders, scheduleEmails } from "@/lib/api";
import type { User, EmailJob, Sender } from "@/types";
import { formatDate } from "@/lib/utils";
import { useRef } from "react";

type View = "list" | "compose" | "detail";
type Tab = "scheduled" | "sent";

function stripHtml(html: string) {
  const tmp = typeof document !== "undefined" ? document.createElement("div") : null;
  if (tmp) { tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ""; }
  return html.replace(/<[^>]*>/g, "");
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("scheduled");
  const [scheduled, setScheduled] = useState<EmailJob[]>([]);
  const [sent, setSent] = useState<EmailJob[]>([]);
  const [view, setView] = useState<View>("list");
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);

  // Compose state
  const [senders, setSenders] = useState<Sender[]>([]);
  const [composeLoading, setComposeLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [manualEmail, setManualEmail] = useState("");
  const [showSendLater, setShowSendLater] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    subject: "",
    body: "",
    senderId: "",
    startAt: "",
    delayBetweenEmails: 0,
    hourlyLimit: 0,
  });

  useEffect(() => {
    getMe().then(setUser).catch(() => router.push("/login"));
  }, [router]);

  const fetchScheduled = useCallback(async () => {
    try { setScheduled(await getScheduledEmails()); }
    catch { /* */ }
    finally { setLoadingScheduled(false); }
  }, []);
  const fetchSent = useCallback(async () => {
    try { setSent(await getSentEmails()); }
    catch { /* */ }
    finally { setLoadingSent(false); }
  }, []);

  useEffect(() => {
    fetchScheduled(); fetchSent();
    const i = setInterval(() => { fetchScheduled(); fetchSent(); }, 10_000);
    return () => clearInterval(i);
  }, [fetchScheduled, fetchSent]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchScheduled(), fetchSent()]);
    setRefreshing(false);
  }

  function openCompose() {
    setView("compose");
    getSenders().then(s => {
      setSenders(s);
      if (s.length > 0) setForm(f => ({ ...f, senderId: s[0].id }));
    }).catch(() => toast.error("Failed to load senders"));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = text.split(/[\n,;\r]+/).map(s => s.trim().toLowerCase())
        .filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
      const unique = Array.from(new Set([...emails, ...parsed]));
      setEmails(unique);
      toast.success(`${unique.length - emails.length} addresses added`);
    };
    reader.readAsText(file);
  }

  function addEmail() {
    const em = manualEmail.trim().toLowerCase();
    if (!em) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast.error("Invalid email"); return; }
    if (emails.includes(em)) { toast.error("Already added"); return; }
    setEmails([...emails, em]);
    setManualEmail("");
  }

  async function handleSchedule() {
    if (!emails.length) { toast.error("Add recipients"); return; }
    if (!form.senderId) { toast.error("No sender configured"); return; }
    if (!form.startAt) { toast.error("Pick a date/time"); return; }

    setComposeLoading(true);
    try {
      const res = await scheduleEmails({
        emails,
        subject: form.subject,
        body: form.body,
        senderId: form.senderId,
        startAt: new Date(form.startAt).toISOString(),
        delayBetweenEmails: form.delayBetweenEmails,
        hourlyLimit: form.hourlyLimit || 100,
      });
      toast.success(`${res.created} email${res.created !== 1 ? "s" : ""} scheduled!`);
      setView("list");
      setEmails([]);
      setForm({ subject: "", body: "", senderId: senders[0]?.id || "", startAt: "", delayBetweenEmails: 0, hourlyLimit: 0 });
      setShowSendLater(false);
      fetchScheduled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setComposeLoading(false);
    }
  }

  async function handleLogout() {
    await logout().catch(() => {});
    router.push("/login");
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  const currentJobs = tab === "scheduled" ? scheduled : sent;
  const loading = tab === "scheduled" ? loadingScheduled : loadingSent;
  const filteredJobs = search
    ? currentJobs.filter(j => j.toEmail.includes(search.toLowerCase()) || j.subject.toLowerCase().includes(search.toLowerCase()))
    : currentJobs;

  // Quick schedule helpers
  function setQuickSchedule(hours: number) {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm(f => ({ ...f, startAt: local }));
    setShowSendLater(false);
    handleSchedule();
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* ====== SIDEBAR ====== */}
      <aside className="sidebar">
        <div className="sidebar-logo">ReachInbox</div>

        {/* User */}
        <div className="sidebar-user">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="sidebar-user-avatar" />
          ) : (
            <div className="sidebar-user-avatar-fallback">{user.name[0]}</div>
          )}
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-email">{user.email}</span>
          </div>
          <ChevronDown style={{ width: 14, height: 14, color: "#9ca3af", flexShrink: 0 }} />
        </div>

        {/* Compose */}
        <button id="compose-btn" className="compose-btn" onClick={openCompose}>
          Compose
        </button>

        {/* Nav */}
        <div className="sidebar-section-label">Core</div>
        <button
          className={`sidebar-nav-item ${tab === "scheduled" && view === "list" ? "active" : ""}`}
          onClick={() => { setTab("scheduled"); setView("list"); }}
        >
          <Clock style={{ width: 16, height: 16 }} />
          Scheduled
          <span className="sidebar-nav-count">{scheduled.length}</span>
        </button>
        <button
          className={`sidebar-nav-item ${tab === "sent" && view === "list" ? "active" : ""}`}
          onClick={() => { setTab("sent"); setView("list"); }}
        >
          <Send style={{ width: 16, height: 16 }} />
          Sent
          <span className="sidebar-nav-count">{sent.length}</span>
        </button>

        {/* Logout at bottom */}
        <div style={{ marginTop: "auto" }}>
          <button className="sidebar-nav-item" onClick={handleLogout} id="logout-btn">
            <LogOut style={{ width: 16, height: 16 }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ====== MAIN ====== */}
      <div className="main-content">
        {/* === LIST VIEW === */}
        {view === "list" && (
          <>
            <div className="topbar">
              <div className="search-box">
                <Search style={{ width: 15, height: 15 }} />
                <input
                  placeholder="Search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="topbar-actions">
                <button className="icon-btn" title="Filter"><Filter style={{ width: 15, height: 15 }} /></button>
                <button className="icon-btn" title="Refresh" onClick={handleRefresh}>
                  <RefreshCw style={{ width: 15, height: 15, ...(refreshing ? { animation: "spin 1s linear infinite" } : {}) }} />
                </button>
              </div>
            </div>

            <div className="animate-fadeIn">
              {loading ? (
                <div className="empty-state">
                  <div className="spinner" style={{ width: 24, height: 24, marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    {tab === "scheduled" ? <Clock style={{ width: 22, height: 22, color: "#9ca3af" }} /> : <Send style={{ width: 22, height: 22, color: "#9ca3af" }} />}
                  </div>
                  <h3>{search ? "No results" : tab === "scheduled" ? "No scheduled emails" : "No sent emails"}</h3>
                  <p>{search ? "Try a different search." : "Click Compose to get started."}</p>
                </div>
              ) : (
                filteredJobs.map(job => (
                  <div
                    key={job.id}
                    className="email-row"
                    onClick={() => { setSelectedEmail(job); setView("detail"); }}
                  >
                    <span className="email-row-to">To: {job.toEmail.split("@")[0]}</span>
                    <span className={`email-row-time ${job.status === "sent" ? "time-sent" : "time-scheduled"}`}>
                      <Clock style={{ width: 10, height: 10 }} />
                      {formatDate(tab === "scheduled" ? job.scheduledAt : job.sentAt)}
                    </span>
                    <span className="email-row-subject">{job.subject}</span>
                    <span style={{ margin: "0 4px", color: "#d1d5db" }}>-</span>
                    <span className="email-row-preview">{stripHtml(job.body)}</span>
                    <Star className="email-row-star" style={{ width: 16, height: 16 }} />
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* === COMPOSE VIEW === */}
        {view === "compose" && (
          <div className="compose-page animate-fadeIn">
            <div className="compose-header">
              <button className="back-btn" onClick={() => setView("list")}>
                <ArrowLeft style={{ width: 18, height: 18 }} />
              </button>
              <h2>Compose New Email</h2>
              <div className="compose-header-actions">
                <button className="icon-btn"><Paperclip style={{ width: 15, height: 15 }} /></button>
                <button className="icon-btn"><Clock style={{ width: 15, height: 15 }} /></button>
                <div style={{ position: "relative" }}>
                  <button className="send-later-btn" onClick={() => setShowSendLater(!showSendLater)}>
                    Send Later
                  </button>
                  {showSendLater && (
                    <div className="send-later-dropdown">
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 6 }}>Pick date & time</label>
                      <input
                        type="datetime-local"
                        value={form.startAt}
                        onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
                      />
                      <button className="send-later-option" onClick={() => {
                        const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
                        setForm(f => ({ ...f, startAt: new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16) }));
                      }}>
                        Tomorrow<span>Tomorrow, 9:00 AM</span>
                      </button>
                      <button className="send-later-option" onClick={() => {
                        const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0);
                        setForm(f => ({ ...f, startAt: new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16) }));
                      }}>
                        Tomorrow, 10:00 AM
                      </button>
                      <button className="send-later-option" onClick={() => {
                        const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0);
                        setForm(f => ({ ...f, startAt: new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16) }));
                      }}>
                        Tomorrow, 11:00 AM
                      </button>
                      <button className="send-later-option" onClick={() => {
                        const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(15, 0, 0, 0);
                        setForm(f => ({ ...f, startAt: new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16) }));
                      }}>
                        Tomorrow, 3:00 PM
                      </button>
                      <div className="send-later-footer">
                        <button className="cancel-btn" onClick={() => setShowSendLater(false)}>Cancel</button>
                        <button className="done-btn" onClick={() => { setShowSendLater(false); handleSchedule(); }} disabled={!form.startAt || composeLoading}>
                          {composeLoading ? "..." : "Done"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button className="send-btn" onClick={handleSchedule} disabled={composeLoading}>
                  {composeLoading ? <span className="spinner" style={{ width: 14, height: 14, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} /> : "Send"}
                </button>
              </div>
            </div>

            <div className="compose-body">
              {/* From */}
              <div className="compose-field">
                <span className="compose-field-label">From</span>
                <select
                  value={form.senderId}
                  onChange={e => setForm(f => ({ ...f, senderId: e.target.value }))}
                  style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 8px", fontSize: 13, fontFamily: "inherit", background: "#f9fafb", color: "#1a1a2e", outline: "none" }}
                >
                  {senders.length === 0 && <option value="">No senders</option>}
                  {senders.map(s => <option key={s.id} value={s.id}>{s.email}</option>)}
                </select>
                <ChevronDown style={{ width: 12, height: 12, color: "#9ca3af", marginLeft: -4 }} />
              </div>

              {/* To */}
              <div className="compose-field">
                <span className="compose-field-label">To</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1, alignItems: "center" }}>
                  {emails.map((em, i) => (
                    <span key={i} className="chip">
                      {em}
                      <button onClick={() => setEmails(emails.filter((_, idx) => idx !== i))}><X style={{ width: 10, height: 10 }} /></button>
                    </span>
                  ))}
                  {emails.length > 3 && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>+{emails.length - 3}</span>}
                  <input
                    className="compose-field-input"
                    placeholder={emails.length ? "" : "recipient@example.com"}
                    value={manualEmail}
                    onChange={e => setManualEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                    style={{ minWidth: 140 }}
                  />
                </div>
                <div className="compose-field-right">
                  <button className="upload-list-btn" onClick={() => fileRef.current?.click()}>
                    <Upload style={{ width: 14, height: 14 }} /> Upload List
                  </button>
                  <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFileChange} />
                </div>
              </div>

              {/* Subject */}
              <div className="compose-field">
                <span className="compose-field-label">Subject</span>
                <input
                  className="compose-field-input"
                  placeholder="Subject"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                />
              </div>

              {/* Delay & Hourly Limit */}
              <div className="compose-inline-row">
                <div className="compose-inline-field">
                  <label>Delay between 2 emails</label>
                  <input
                    type="number"
                    min={0}
                    value={form.delayBetweenEmails}
                    onChange={e => setForm(f => ({ ...f, delayBetweenEmails: Number(e.target.value) }))}
                  />
                </div>
                <div className="compose-inline-field">
                  <label>Hourly Limit</label>
                  <input
                    type="number"
                    min={0}
                    value={form.hourlyLimit}
                    onChange={e => setForm(f => ({ ...f, hourlyLimit: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Body */}
              <textarea
                className="compose-textarea"
                placeholder="Type Your Reply..."
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* === DETAIL VIEW === */}
        {view === "detail" && selectedEmail && (
          <div className="animate-fadeIn">
            <div className="detail-header">
              <button className="back-btn" onClick={() => setView("list")}>
                <ArrowLeft style={{ width: 18, height: 18 }} />
              </button>
              <h2>{selectedEmail.subject}</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`status-badge ${
                  selectedEmail.status === "sent" ? "time-sent" :
                  selectedEmail.status === "failed" ? "time-scheduled" :
                  "time-scheduled"
                }`} style={{ textTransform: "capitalize" }}>
                  {selectedEmail.status}
                </span>
              </div>
            </div>

            <div className="detail-body">
              <div className="detail-sender">
                <div className="detail-sender-avatar" style={{ background: "#22c55e" }}>
                  {(selectedEmail.sender?.email || "?")[0].toUpperCase()}
                </div>
                <div className="detail-sender-info">
                  <div className="detail-sender-name">
                    {selectedEmail.sender?.email || "Unknown Sender"}
                  </div>
                  <div className="detail-sender-email">to {selectedEmail.toEmail}</div>
                </div>
                <div className="detail-sender-date">
                  {formatDate(selectedEmail.scheduledAt)}
                </div>
              </div>

              <div className="detail-email-body" dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />

              {selectedEmail.error && (
                <div style={{ marginTop: 20, padding: "12px 16px", background: "#fee2e2", borderRadius: 8, fontSize: 13, color: "#b91c1c" }}>
                  <strong>Error:</strong> {selectedEmail.error}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
