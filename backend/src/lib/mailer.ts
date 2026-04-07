import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

// Creates a transporter for the given sender's SMTP config.
// Each sender has their own Ethereal creds so rate limits are per-account.
export function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

// Call this once at startup to create a default Ethereal test account
// if ETHEREAL_USER/PASS aren't set in env
export async function createEtherealAccount() {
  const account = await nodemailer.createTestAccount();
  console.log("🧪 Ethereal test account created:");
  console.log("  User:", account.user);
  console.log("  Pass:", account.pass);
  console.log("  Host:", account.smtp.host);
  console.log("  Port:", account.smtp.port);
  return account;
}

export function getPreviewUrl(info: nodemailer.SentMessageInfo) {
  return nodemailer.getTestMessageUrl(info);
}
