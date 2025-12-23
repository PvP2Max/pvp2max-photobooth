import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || "photos@boothos.app";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      throw new Error("SMTP configuration missing");
    }
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
  }
  return transporter;
}

export type PhotosEmailParams = {
  to: string;
  eventName: string;
  photoCount: number;
  downloadUrl: string;
  thumbnailUrls?: string[];
};

export async function sendPhotosEmail(params: PhotosEmailParams): Promise<void> {
  const { to, eventName, photoCount, downloadUrl, thumbnailUrls = [] } = params;

  const transport = getTransporter();

  const thumbnailsHtml = thumbnailUrls.length > 0
    ? `<div style="margin: 24px 0;">${thumbnailUrls.map((url) => `<img src="${url}" alt="Photo preview" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin: 4px;" />`).join("")}</div>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Your Photos from ${eventName}</title></head>
    <body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0;">Your Photos Are Ready!</h1>
        </div>
        <div style="background-color: white; border-radius: 0 0 16px 16px; padding: 32px;">
          <p style="color: #374151;">Your ${photoCount} photo${photoCount !== 1 ? "s" : ""} from <strong>${eventName}</strong> ${photoCount === 1 ? "is" : "are"} ready to download.</p>
          ${thumbnailsHtml}
          <div style="text-align: center; margin: 32px 0;">
            <a href="${downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">Download Photos</a>
          </div>
          <p style="color: #6b7280; font-size: 14px; text-align: center;">This download link will expire in 7 days.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transport.sendMail({
    from: `BoothOS <${EMAIL_FROM}>`,
    to,
    subject: `Your Photos from ${eventName}`,
    text: `Your ${photoCount} photos from ${eventName} are ready. Download: ${downloadUrl}`,
    html,
  });
}
