import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ReachInbox – Email Campaign Scheduler",
  description: "Schedule and manage email campaigns with smart rate limiting and delivery tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased min-h-screen" style={{ background: "#f8f9fa" }}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a1a2e",
              color: "#fff",
              borderRadius: "10px",
              fontSize: "14px",
              padding: "12px 16px",
            },
            success: {
              iconTheme: { primary: "#22c55e", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
