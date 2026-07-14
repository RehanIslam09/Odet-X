/**
 * Nodemailer transporter initialization.
 *
 * TODO: Install dependency — `npm install nodemailer @types/nodemailer`
 * TODO: Add required env vars to config/env.ts:
 *   - SMTP_HOST
 *   - SMTP_PORT
 *   - SMTP_USER
 *   - SMTP_PASS
 *   - SMTP_FROM (e.g. "AI Project Manager <no-reply@example.com>")
 *
 * Usage (future):
 * ```ts
 * import { sendMail } from "@/lib/mailer.js";
 * await sendMail({
 *   to: user.email,
 *   subject: "Verify your email",
 *   html: "<p>Click the link to verify...</p>",
 * });
 * ```
 */

// import nodemailer from "nodemailer";
// import { env } from "@/config/env.js";
//
// const transporter = nodemailer.createTransport({
//   host: env.SMTP_HOST,
//   port: env.SMTP_PORT,
//   auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
// });
//
// export async function sendMail(options: {
//   to: string;
//   subject: string;
//   html: string;
// }) {
//   return transporter.sendMail({ from: env.SMTP_FROM, ...options });
// }

export {};
