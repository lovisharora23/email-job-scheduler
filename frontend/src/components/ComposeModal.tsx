"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { Upload, X } from "lucide-react";
import { getSenders, scheduleEmails } from "@/lib/api";
import type { Sender } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

export function ComposeModal({ open, onClose, onScheduled }: Props) {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [manualEmail, setManualEmail] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    subject: "",
    body: "",
    senderId: "",
    startAt: "",
    delayBetweenEmails: 5,
    hourlyLimit: 100,
  });

  useEffect(() => {
    if (open) {
      getSenders()
        .then((s) => {
          setSenders(s);
          if (s.length > 0 && !form.senderId) {
            setForm((f) => ({ ...f, senderId: s[0].id }));
          }
        })
        .catch(() => toast.error("Failed to load senders"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = text
        .split(/[\n,;\r]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
      
      const unique = Array.from(new Set([...emails, ...parsed]));
      setEmails(unique);
      
      const newCount = unique.length - emails.length;
      toast.success(`${newCount} new address${newCount !== 1 ? "es" : ""} added (${unique.length} total)`);
    };
    reader.readAsText(file);
  }

  function addManualEmail() {
    const em = manualEmail.trim().toLowerCase();
    if (!em) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast.error("Invalid email address");
      return;
    }
    if (emails.includes(em)) {
      toast.error("Already added");
      return;
    }
    setEmails([...emails, em]);
    setManualEmail("");
  }

  function removeEmail(i: number) {
    setEmails((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (emails.length === 0) {
      toast.error("Add at least one recipient email address");
      return;
    }
    if (!form.senderId) {
      toast.error("Select a sender account");
      return;
    }
    if (!form.startAt) {
      toast.error("Select a start time");
      return;
    }

    setLoading(true);
    try {
      const res = await scheduleEmails({
        emails,
        subject: form.subject,
        body: form.body,
        senderId: form.senderId,
        startAt: new Date(form.startAt).toISOString(),
        delayBetweenEmails: form.delayBetweenEmails,
        hourlyLimit: form.hourlyLimit,
      });
      toast.success(`🎉 ${res.created} email${res.created !== 1 ? "s" : ""} scheduled!`);
      onScheduled();
      onClose();
      setEmails([]);
      setForm({ subject: "", body: "", senderId: senders[0]?.id || "", startAt: "", delayBetweenEmails: 5, hourlyLimit: 100 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scheduling failed");
    } finally {
      setLoading(false);
    }
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [k]: val }));
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a2e" }}>Compose New Campaign</h2>
          <button
            onClick={onClose}
            style={{
              padding: "6px", background: "#f3f4f6", border: "none",
              borderRadius: "8px", cursor: "pointer", color: "#6b7280",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e5e7eb"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f3f4f6"; }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Subject */}
            <div>
              <label className="form-label">Subject</label>
              <input className="form-input" placeholder="Your email subject..." required value={form.subject} onChange={f("subject")} />
            </div>

            {/* Body */}
            <div>
              <label className="form-label">Body (HTML supported)</label>
              <textarea
                className="form-input"
                placeholder="<p>Hi there, ...</p>"
                rows={4}
                required
                value={form.body}
                onChange={f("body")}
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Recipients */}
            <div>
              <label className="form-label">Recipients</label>
              {/* Manual input */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  className="form-input"
                  placeholder="Type email and press Enter..."
                  value={manualEmail}
                  onChange={e => setManualEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addManualEmail(); } }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addManualEmail}
                  className="btn-ghost"
                  style={{ padding: "10px 16px", whiteSpace: "nowrap" }}
                >
                  Add
                </button>
              </div>
              {/* File upload */}
              <div
                className="upload-zone"
                onClick={() => fileRef.current?.click()}
              >
                <Upload style={{ width: 20, height: 20, color: "#9ca3af", margin: "0 auto 8px" }} />
                <span style={{ fontSize: "13px", color: "#6b7280" }}>
                  Or upload a CSV/TXT file with email addresses
                </span>
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFileChange} />
              </div>
              {/* Chips */}
              {emails.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px", maxHeight: "80px", overflowY: "auto" }}>
                  {emails.map((em, i) => (
                    <span key={i} className="email-chip">
                      {em}
                      <button type="button" onClick={() => removeEmail(i)}><X style={{ width: 12, height: 12 }} /></button>
                    </span>
                  ))}
                </div>
              )}
              {emails.length > 0 && (
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>{emails.length} recipient{emails.length !== 1 ? "s" : ""}</p>
              )}
            </div>

            {/* Row: Start Time + Delay */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label className="form-label">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.startAt}
                  onChange={f("startAt")}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Delay Between Emails (s)</label>
                <input className="form-input" type="number" min={0} value={form.delayBetweenEmails} onChange={f("delayBetweenEmails")} />
              </div>
            </div>

            {/* Row: Hourly Limit + Sender */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label className="form-label">Hourly Limit</label>
                <input className="form-input" type="number" min={1} value={form.hourlyLimit} onChange={f("hourlyLimit")} />
              </div>
              <div>
                <label className="form-label">Sender Account</label>
                <select
                  value={form.senderId}
                  onChange={f("senderId")}
                  className="form-input"
                  style={{ cursor: "pointer" }}
                >
                  {senders.length === 0 && <option value="">No senders configured</option>}
                  {senders.map((s) => (
                    <option key={s.id} value={s.id}>{s.email}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            paddingTop: "24px",
            marginTop: "24px",
            borderTop: "1px solid #e5e7eb",
          }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={senders.length === 0 || loading}>
              {loading && <span className="spinner" />}
              Schedule Emails
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
