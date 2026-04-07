"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { Upload, X } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input, Textarea } from "./Input";
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
      // split on commas, newlines, semicolons — whatever the user throws at us
      const parsed = text
        .split(/[\n,;\r]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)); // strict email check
      
      const unique = Array.from(new Set(parsed)); // remove duplicates
      setEmails(unique);
      
      if (unique.length < parsed.length) {
        toast.success(`${unique.length} addresses detected (${parsed.length - unique.length} duplicates removed)`);
      } else {
        toast.success(`${unique.length} addresses detected`);
      }
    };
    reader.readAsText(file);
  }

  function removeEmail(i: number) {
    setEmails((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (emails.length === 0) {
      toast.error("No email addresses — upload a CSV or TXT file first");
      return;
    }
    if (!form.senderId) {
      toast.error("Select a sender");
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
      toast.success(`${res.created} emails scheduled!`);
      onScheduled();
      onClose();
      // reset
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

  return (
    <Modal open={open} onClose={onClose} title="Compose New Campaign" className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Subject" placeholder="Your email subject..." required value={form.subject} onChange={f("subject")} />

        <Textarea
          label="Body (HTML supported)"
          placeholder="<p>Hi there, ...</p>"
          rows={4}
          required
          value={form.body}
          onChange={f("body")}
        />

        {/* file upload */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/70">Recipient List</label>
          <div
            className="border border-dashed border-white/20 rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-indigo-500/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-5 h-5 text-white/30" />
            <span className="text-sm text-white/40">
              {emails.length > 0 ? `${emails.length} addresses detected` : "Upload CSV or TXT"}
            </span>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
          </div>
          {/* preview first few */}
          {emails.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
              {emails.slice(0, 10).map((em, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs">
                  {em}
                  <button type="button" onClick={() => removeEmail(i)}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
              {emails.length > 10 && <span className="text-xs text-white/30 flex items-center">+{emails.length - 10} more</span>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">Start Time</label>
            <input
              type="datetime-local"
              required
              value={form.startAt}
              onChange={f("startAt")}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
            />
          </div>
          <Input
            label="Delay Between Emails (s)"
            type="number"
            min={0}
            value={form.delayBetweenEmails}
            onChange={f("delayBetweenEmails")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Hourly Limit"
            type="number"
            min={1}
            value={form.hourlyLimit}
            onChange={f("hourlyLimit")}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">Sender Account</label>
            <select
              value={form.senderId}
              onChange={f("senderId")}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
            >
              {senders.length === 0 && <option value="">No senders configured</option>}
              {senders.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#13131a]">
                  {s.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/8">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} disabled={senders.length === 0}>
            Schedule Emails
          </Button>
        </div>
      </form>
    </Modal>
  );
}
