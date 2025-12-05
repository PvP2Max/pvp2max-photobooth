import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  attachments: MailAttachment[];
};

function smtpConfigPresent() {
  return (
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_PORT &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASSWORD &&
    !!process.env.EMAIL_FROM
  );
}

export async function sendMail(payload: MailPayload) {
  if (smtpConfigPresent()) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    try {
      await transporter.sendMail({
        to: payload.to,
        from: process.env.EMAIL_FROM,
        subject: payload.subject,
        html: payload.html,
        attachments: payload.attachments,
      });
      return { delivered: true, mode: "smtp" as const };
    } catch (error) {
      console.error("SMTP send failed, falling back to local outbox", error);
      // Continue to local fallback below.
    }
  }

  const fallbackRoot = path.join(process.cwd(), "storage", "outbox");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fallbackDir = path.join(fallbackRoot, `email-${timestamp}`);
  await mkdir(fallbackDir, { recursive: true });

  await Promise.all(
    payload.attachments.map((attachment) =>
      writeFile(path.join(fallbackDir, attachment.filename), attachment.content),
    ),
  );

  const filename = path.join(fallbackDir, "email.html");
  const attachments = payload.attachments
    .map(
      (attachment) =>
        `Saved attachment ${attachment.filename} (${attachment.contentType}, ${attachment.content.length} bytes)`,
    )
    .join("\n");
  const content = [
    `<p>This is a local-only fallback. Configure SMTP_* env vars to deliver email.</p>`,
    `<p>To: ${payload.to}</p>`,
    `<p>Subject: ${payload.subject}</p>`,
    payload.html,
    `<pre>${attachments}</pre>`,
  ].join("\n");
  await writeFile(filename, content, "utf8");
  return {
    delivered: false,
    mode: "local-fallback" as const,
    file: filename,
    folder: fallbackDir,
  };
}
