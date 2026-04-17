/**
 * iHIMS Email Service
 *
 * A zero-dependency SMTP client using Node.js built-in net/tls modules.
 * Supports STARTTLS (port 587) and implicit TLS (port 465).
 * Falls back to console-simulation when SMTP credentials are absent.
 *
 * Required env vars (all optional — simulation when absent):
 *   SMTP_HOST       e.g. smtp.gmail.com
 *   SMTP_PORT       587 (STARTTLS) or 465 (SSL/TLS) — default: 587
 *   SMTP_USER       e.g. noreply@yourhospital.com
 *   SMTP_PASS       App password / SMTP password
 *   SMTP_FROM       Display name + address, e.g. "iHIMS Hospital <noreply@hospital.com>"
 *                   (defaults to SMTP_USER if not set)
 *
 * Gmail quickstart:
 *   1. Enable 2FA on your Google account
 *   2. Go to https://myaccount.google.com/apppasswords
 *   3. Create an app password for "Mail"
 *   4. Set SMTP_HOST=smtp.gmail.com  SMTP_PORT=587  SMTP_USER=you@gmail.com  SMTP_PASS=<app-pw>
 */

import net from 'net';
import tls from 'tls';

// ── Config ─────────────────────────────────────────────────────────────────────

const SMTP_HOST = process.env['SMTP_HOST'] || '';
const SMTP_PORT = parseInt(process.env['SMTP_PORT'] || '587', 10);
const SMTP_USER = process.env['SMTP_USER'] || '';
const SMTP_PASS = process.env['SMTP_PASS'] || '';
const SMTP_FROM = process.env['SMTP_FROM'] || SMTP_USER;

export const isEmailEnabled = (): boolean => !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EmailOptions {
  to:      string;
  subject: string;
  html:    string;
  text?:   string;
}

export interface EmailResult {
  sent:        boolean;
  isSimulated: boolean;
  messageId:   string;
}

// ── SMTP raw client ────────────────────────────────────────────────────────────

function smtpSend(opts: EmailOptions): Promise<EmailResult> {
  return new Promise((resolve, reject) => {
    const useSSL = SMTP_PORT === 465;
    const domain = SMTP_HOST.split('.').slice(-2).join('.');

    // MIME message construction
    const boundary = `----=_Part_${Date.now().toString(16)}`;
    const textPart = opts.text || stripHtml(opts.html);
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}>`;

    const mime = [
      `From: ${SMTP_FROM}`,
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      '',
      qpEncode(textPart),
      '',
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      '',
      qpEncode(opts.html),
      '',
      `--${boundary}--`,
    ].join('\r\n');

    // State machine
    let socket: net.Socket | tls.TLSSocket;
    let buffer = '';
    let state: 'BANNER' | 'EHLO1' | 'STARTTLS' | 'EHLO2' | 'AUTH_USER' | 'AUTH_PASS' | 'MAIL_FROM' | 'RCPT_TO' | 'DATA' | 'BODY' | 'QUIT' | 'DONE' = 'BANNER';
    let tlsUpgraded = false;

    function handleLine(line: string) {
      const code = parseInt(line.slice(0, 3), 10);
      const isLast = line[3] === ' ';
      if (!isLast) return; // multi-line — wait for last

      switch (state) {
        case 'BANNER':
          if (code === 220) {
            send(`EHLO ${domain}`);
            state = useSSL ? 'EHLO2' : 'EHLO1'; // SSL → already encrypted
          }
          break;

        case 'EHLO1':
          if (code === 250) {
            send('STARTTLS');
            state = 'STARTTLS';
          }
          break;

        case 'STARTTLS':
          if (code === 220) {
            // Upgrade the socket to TLS
            const plain = socket as net.Socket;
            const tlsSock = tls.connect({ socket: plain, servername: SMTP_HOST, rejectUnauthorized: false }, () => {
              socket = tlsSock;
              send(`EHLO ${domain}`);
              state = 'EHLO2';
            });
            tlsSock.setEncoding('utf-8');
            tlsSock.on('data', onData);
            tlsSock.on('error', reject);
            tlsUpgraded = true;
          }
          break;

        case 'EHLO2':
          if (code === 250) {
            send('AUTH LOGIN');
            state = 'AUTH_USER';
          }
          break;

        case 'AUTH_USER':
          if (code === 334) {
            send(Buffer.from(SMTP_USER).toString('base64'));
            state = 'AUTH_PASS';
          }
          break;

        case 'AUTH_PASS':
          if (code === 334) {
            send(Buffer.from(SMTP_PASS).toString('base64'));
            state = 'MAIL_FROM';
          }
          break;

        case 'MAIL_FROM':
          if (code === 235) {
            // Auth accepted
            const from = SMTP_FROM.match(/<([^>]+)>/)?.[1] ?? SMTP_USER;
            send(`MAIL FROM:<${from}>`);
          } else if (code === 250) {
            send(`RCPT TO:<${opts.to}>`);
            state = 'RCPT_TO';
          }
          break;

        case 'RCPT_TO':
          if (code === 250) {
            send('DATA');
            state = 'DATA';
          }
          break;

        case 'DATA':
          if (code === 354) {
            send(mime + '\r\n.');
            state = 'BODY';
          }
          break;

        case 'BODY':
          if (code === 250) {
            send('QUIT');
            state = 'QUIT';
          }
          break;

        case 'QUIT':
          socket.destroy();
          resolve({ sent: true, isSimulated: false, messageId });
          state = 'DONE';
          break;

        default:
          if (code >= 400) {
            reject(new Error(`SMTP error ${code}: ${line.slice(4)}`));
          }
      }
    }

    function send(cmd: string) {
      socket.write(cmd + '\r\n');
    }

    function onData(chunk: string) {
      if (tlsUpgraded && state === 'STARTTLS') return; // TLS handler takes over
      buffer += chunk;
      const lines = buffer.split('\r\n');
      buffer = lines.pop() ?? '';
      lines.forEach(handleLine);
    }

    // Connect
    if (useSSL) {
      socket = tls.connect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST, rejectUnauthorized: false });
    } else {
      socket = net.connect({ host: SMTP_HOST, port: SMTP_PORT });
    }

    socket.setEncoding('utf-8');
    socket.on('data', onData);
    socket.on('error', reject);
    socket.on('timeout', () => reject(new Error('SMTP connection timeout')));
    socket.setTimeout(15_000);
  });
}

// ── Quoted-Printable encoder (RFC 2045) ──────────────────────────────────────

function qpEncode(input: string): string {
  return input
    .replace(/[^\x20-\x7e\t\r\n]/g, (ch) => {
      const bytes = Buffer.from(ch, 'utf-8');
      return [...bytes].map(b => `=${b.toString(16).toUpperCase().padStart(2, '0')}`).join('');
    })
    .replace(/.{73,}/g, (line) => {
      const chunks: string[] = [];
      while (line.length > 75) {
        chunks.push(line.slice(0, 75) + '=');
        line = line.slice(75);
      }
      chunks.push(line);
      return chunks.join('\r\n');
    });
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendEmail(opts: EmailOptions): Promise<EmailResult> {
  if (!isEmailEnabled()) {
    // Simulation: log to console
    console.log(`\n[Email SIMULATION]`);
    console.log(`  To:      ${opts.to}`);
    console.log(`  Subject: ${opts.subject}`);
    console.log(`  Body:    ${stripHtml(opts.html).slice(0, 200)}...\n`);
    return { sent: true, isSimulated: true, messageId: `SIM-${Date.now()}` };
  }

  try {
    return await smtpSend(opts);
  } catch (err) {
    console.error('[Email] Failed to send:', err);
    // Degrade gracefully — log and return simulated
    return { sent: false, isSimulated: true, messageId: `FAIL-${Date.now()}` };
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

const brandName = () => process.env['APP_NAME'] || 'iHIMS Hospital';

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1677ff; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .button { display: inline-block; background: #1677ff; color: #fff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0; }
    .footer { background: #f9f9f9; padding: 16px 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
    .info-box { background: #f0f7ff; border-left: 4px solid #1677ff; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
    .warning-box { background: #fff7e6; border-left: 4px solid #fa8c16; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${brandName()}</h1></div>
    <div class="body">${content}</div>
    <div class="footer">This is an automated message from ${brandName()}. Please do not reply to this email.</div>
  </div>
</body>
</html>`;

export function passwordResetEmail(opts: { name: string; resetUrl: string; expiresIn: string }): EmailOptions {
  return {
    to: '', // caller fills this in
    subject: `Password Reset Request — ${brandName()}`,
    html: baseTemplate(`
      <h2>Password Reset Request</h2>
      <p>Hello ${opts.name},</p>
      <p>We received a request to reset the password for your account. Click the button below to create a new password:</p>
      <a class="button" href="${opts.resetUrl}">Reset My Password</a>
      <div class="warning-box">
        <strong>⚠ This link expires in ${opts.expiresIn}.</strong><br>
        If you did not request a password reset, please ignore this email and your password will remain unchanged.
      </div>
      <p>Or copy and paste this link into your browser:<br>
      <small style="color:#666;word-break:break-all;">${opts.resetUrl}</small></p>
    `),
  };
}

export function appointmentConfirmationEmail(opts: {
  patientName:    string;
  doctorName:     string;
  department:     string;
  appointmentDate: string;
  appointmentTime: string;
  type:           string;
  portalUrl:      string;
}): EmailOptions {
  return {
    to: '',
    subject: `Appointment Confirmed — ${opts.appointmentDate}`,
    html: baseTemplate(`
      <h2>Appointment Confirmation</h2>
      <p>Dear ${opts.patientName},</p>
      <p>Your appointment has been successfully scheduled.</p>
      <div class="info-box">
        <strong>Appointment Details</strong><br>
        📅 Date: ${opts.appointmentDate}<br>
        🕐 Time: ${opts.appointmentTime}<br>
        👨‍⚕️ Doctor: ${opts.doctorName}<br>
        🏥 Department: ${opts.department}<br>
        📋 Type: ${opts.type}
      </div>
      <p>Please arrive 15 minutes before your scheduled time. Bring any relevant medical records or documents.</p>
      <a class="button" href="${opts.portalUrl}">View in Patient Portal</a>
    `),
  };
}

export function appointmentReminderEmail(opts: {
  patientName:    string;
  doctorName:     string;
  appointmentDate: string;
  appointmentTime: string;
  portalUrl:      string;
}): EmailOptions {
  return {
    to: '',
    subject: `Appointment Reminder — Tomorrow at ${opts.appointmentTime}`,
    html: baseTemplate(`
      <h2>Appointment Reminder</h2>
      <p>Dear ${opts.patientName},</p>
      <p>This is a friendly reminder that you have an appointment <strong>tomorrow</strong>.</p>
      <div class="info-box">
        📅 <strong>${opts.appointmentDate}</strong> at <strong>${opts.appointmentTime}</strong><br>
        👨‍⚕️ with ${opts.doctorName}
      </div>
      <p>Please arrive 15 minutes early. To reschedule, visit the patient portal.</p>
      <a class="button" href="${opts.portalUrl}">Manage Appointment</a>
    `),
  };
}

export function telemedicineBookingEmail(opts: {
  patientName:    string;
  doctorName:     string;
  scheduledAt:    string;
  roomCode:       string;
  joinUrl:        string;
}): EmailOptions {
  return {
    to: '',
    subject: `Telemedicine Session Scheduled — ${opts.scheduledAt}`,
    html: baseTemplate(`
      <h2>Telemedicine Session Confirmed</h2>
      <p>Dear ${opts.patientName},</p>
      <p>Your virtual consultation has been scheduled.</p>
      <div class="info-box">
        📅 <strong>${opts.scheduledAt}</strong><br>
        👨‍⚕️ Doctor: ${opts.doctorName}<br>
        🔑 Room Code: <strong style="font-family:monospace;font-size:18px;">${opts.roomCode}</strong>
      </div>
      <p>At the scheduled time, click the button below to join your video consultation:</p>
      <a class="button" href="${opts.joinUrl}">Join Video Consultation</a>
      <div class="warning-box">
        <strong>Before your appointment:</strong><br>
        • Ensure you have a working camera and microphone<br>
        • Use a modern browser (Chrome, Firefox, or Edge)<br>
        • Find a private, well-lit location
      </div>
    `),
  };
}

export function passwordChangedEmail(opts: { name: string }): EmailOptions {
  return {
    to: '',
    subject: `Your password was changed — ${brandName()}`,
    html: baseTemplate(`
      <h2>Password Changed</h2>
      <p>Hello ${opts.name},</p>
      <p>Your account password was successfully changed.</p>
      <div class="warning-box">
        If you did not make this change, please contact your system administrator immediately or use the password reset link.
      </div>
    `),
  };
}
