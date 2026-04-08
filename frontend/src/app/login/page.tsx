"use client";

import { Mail } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa" }}>
      <div className="animate-slideUp" style={{ width: "100%", maxWidth: "400px", padding: "0 16px" }}>
        <div style={{
          background: "white",
          borderRadius: "16px",
          padding: "40px 36px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <span style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-1px", color: "#1a1a2e" }}>
              ReachInbox
            </span>
          </div>

          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a2e", textAlign: "center", marginBottom: "8px" }}>
            Login
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280", textAlign: "center", marginBottom: "28px" }}>
            Sign in to manage your email campaigns
          </p>

          <a
            id="google-signin-btn"
            href={`${API}/api/auth/google`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              width: "100%", padding: "12px 20px",
              background: "#22c55e", color: "white",
              border: "none", borderRadius: "8px",
              fontSize: "14px", fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#16a34a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#22c55e"; }}
          >
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
              <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="white" fillOpacity="0.8" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="white" fillOpacity="0.6" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="white" fillOpacity="0.9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Login with Google
          </a>

          <p style={{ textAlign: "center", fontSize: "11px", color: "#9ca3af", marginTop: "20px" }}>
            Sessions are encrypted & stored securely
          </p>
        </div>
      </div>
    </main>
  );
}
