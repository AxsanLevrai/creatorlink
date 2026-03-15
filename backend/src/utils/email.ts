import nodemailer from 'nodemailer';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templates: Record<string, (data: Record<string, string>) => string> = {
  'verify-email': (d) => `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#7C3AED">Welcome to CreatorLink, ${d.name}!</h2>
      <p>Please verify your email address to activate your account.</p>
      <a href="${d.link}" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Verify Email
      </a>
      <p style="color:#666;font-size:12px;margin-top:24px">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    </div>`,
  'reset-password': (d) => `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#7C3AED">Reset your password</h2>
      <p>Hi ${d.name}, click below to reset your CreatorLink password. This link expires in ${d.expires_in}.</p>
      <a href="${d.link}" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Reset Password
      </a>
      <p style="color:#666;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
    </div>`,
  'application-received': (d) => `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#7C3AED">New application for "${d.project_title}"</h2>
      <p>Hi ${d.client_name}, <strong>${d.creator_name}</strong> has applied to your project.</p>
      <a href="${d.link}" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Review Application
      </a>
    </div>`,
};

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, string>;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (process.env.NODE_ENV === 'test') return;

  try {
    const html = templates[options.template]?.(options.data) ?? `<p>${JSON.stringify(options.data)}</p>`;
    await transporter.sendMail({
      from: `"CreatorLink" <${process.env.SMTP_FROM || 'noreply@creatorlink.io'}>`,
      to: options.to,
      subject: options.subject,
      html,
    });
    logger.info(`Email sent: ${options.template} → ${options.to}`);
  } catch (err) {
    logger.error('Email send failed', err);
    // Don't throw — email failures shouldn't break the request
  }
};
