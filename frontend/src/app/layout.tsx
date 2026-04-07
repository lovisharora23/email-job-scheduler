import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ReachInbox Scheduler",
  description: "Production-grade email job scheduler built on BullMQ + PostgreSQL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-[#0a0a10] text-white min-h-screen">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1e1e2e",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: "14px",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
