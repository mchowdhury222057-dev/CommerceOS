import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "./logger.js";

// Per this milestone's Section 27/28 - real dev-mode email sending, not
// just an on-screen link. Two modes:
//   1. EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD set (Mailtrap, a persisted
//      Ethereal inbox, or a real SMTP provider in production) -> use them.
//   2. None set -> auto-provision a fresh Ethereal test account at server
//      startup (nodemailer.createTestAccount(), Nodemailer's own
//      documented pattern for this) so local dev works with zero manual
//      setup. Every send logs a preview URL to view the actual email.
// Fails loudly (throws), never silently pretends to have sent anything -
// a missing/broken email config must surface as an error, not a no-op.
let transporterPromise: Promise<{ transporter: Transporter; from: string; isAutoProvisioned: boolean }> | null = null;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM } = process.env;

      if (EMAIL_HOST && EMAIL_USER && EMAIL_PASSWORD) {
        const transporter = nodemailer.createTransport({
          host: EMAIL_HOST,
          port: EMAIL_PORT ? Number(EMAIL_PORT) : 587,
          secure: false,
          auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
        });
        await transporter.verify();
        logger.info({ msg: "Email transporter ready (configured SMTP)", host: EMAIL_HOST });
        return { transporter, from: EMAIL_FROM ?? EMAIL_USER, isAutoProvisioned: false };
      }

      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD are not configured - refusing to auto-provision a throwaway Ethereal " +
            "account in production. Set real SMTP credentials.",
        );
      }

      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      logger.info({
        msg: "EMAIL_HOST not set - auto-provisioned a fresh Ethereal dev inbox for this server run",
        user: testAccount.user,
        note: "Every sent email logs a preview URL below. To use a persistent inbox instead, set EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASSWORD.",
      });
      return { transporter, from: EMAIL_FROM ?? testAccount.user, isAutoProvisioned: true };
    })().catch((error) => {
      transporterPromise = null; // allow retry on next send rather than caching a permanent failure
      throw error;
    });
  }
  return transporterPromise;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const { transporter, from } = await getTransporter();
  const info = await transporter.sendMail({ from, to, subject, html });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  logger.info({ msg: "Email sent", to, subject, previewUrl: previewUrl || undefined, messageId: info.messageId });
}
