/**
 * Semaphore SMS Service
 * Docs: https://semaphore.co/docs
 * API: POST https://api.semaphore.co/api/v4/messages
 */

import https from 'https';
import querystring from 'querystring';

export interface SemaphoreResult {
  messageId: string;
  status: string;
}

/**
 * Send a single SMS via Semaphore API.
 * Falls back to simulation if SEMAPHORE_API_KEY is not configured.
 */
export async function sendSms(
  recipientNumber: string,
  message: string,
  senderName = 'iHIMS'
): Promise<SemaphoreResult> {
  const apiKey = process.env.SEMAPHORE_API_KEY;

  if (!apiKey) {
    // Dev fallback — log and simulate
    console.warn('[SMS] SEMAPHORE_API_KEY not set — simulating send');
    return { messageId: `SIM-${Date.now()}`, status: 'Simulated' };
  }

  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      apikey: apiKey,
      number: recipientNumber.replace(/\s+/g, ''),
      message,
      sendername: senderName,
    });

    const options = {
      hostname: 'api.semaphore.co',
      path: '/api/v4/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Semaphore returns an array of message objects
          const first = Array.isArray(parsed) ? parsed[0] : parsed;
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              messageId: String(first?.message_id || first?.messageId || Date.now()),
              status: first?.status || 'Queued',
            });
          } else {
            reject(new Error(first?.message || `Semaphore API error: ${res.statusCode}`));
          }
        } catch {
          reject(new Error(`Failed to parse Semaphore response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Send a password reset SMS.
 */
export async function sendResetSms(phone: string, token: string): Promise<void> {
  const message =
    `Your iHIMS password reset token is: ${token}\n` +
    `This token expires in 1 hour. Do not share it with anyone.`;
  await sendSms(phone, message);
}
