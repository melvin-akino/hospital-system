/**
 * PayMongo payment gateway integration
 *
 * Supports GCash, Maya, and card payments via the PayMongo v1 API.
 * Falls back to simulation mode if PAYMONGO_SECRET_KEY is not set.
 *
 * Docs: https://developers.paymongo.com/reference
 */

import https from 'https';

const PAYMONGO_BASE = 'api.paymongo.com';
const SECRET_KEY = process.env['PAYMONGO_SECRET_KEY'] || '';
const BASE64_KEY = Buffer.from(`${SECRET_KEY}:`).toString('base64');

export type PaymongoMethod = 'gcash' | 'paymaya' | 'card';

export interface PaymongoLinkResult {
  /** PayMongo payment link or source ID */
  paymentIntentId: string;
  checkoutUrl: string;
  status: 'pending';
  isSimulated: boolean;
}

function paymongoRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';

    const options: https.RequestOptions = {
      hostname: PAYMONGO_BASE,
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${BASE64_KEY}`,
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(parsed?.errors?.[0]?.detail || `PayMongo error ${res.statusCode}`));
          } else {
            resolve(parsed as T);
          }
        } catch {
          reject(new Error('Invalid PayMongo response'));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── GCash / Maya via Payment Links ────────────────────────────────────────────
async function createPaymentLink(
  amount: number,
  description: string,
  method: 'gcash' | 'paymaya'
): Promise<PaymongoLinkResult> {
  if (!SECRET_KEY) {
    return simulatePayment(amount, method === 'gcash' ? 'GCASH' : 'MAYA');
  }

  const body = {
    data: {
      attributes: {
        amount: Math.round(amount * 100), // PayMongo uses centavos
        description,
        payment_method_types: [method],
        currency: 'PHP',
        redirect: {
          success: `${process.env['APP_URL'] || 'http://localhost:5175'}/payments/success`,
          failed: `${process.env['APP_URL'] || 'http://localhost:5175'}/payments/failed`,
        },
      },
    },
  };

  const resp = await paymongoRequest<any>('POST', '/v1/links', body);
  const link = resp?.data;

  return {
    paymentIntentId: link?.id,
    checkoutUrl: link?.attributes?.checkout_url,
    status: 'pending',
    isSimulated: false,
  };
}

// ── Card payments via Payment Intents ─────────────────────────────────────────
async function createCardPaymentIntent(
  amount: number,
  description: string
): Promise<PaymongoLinkResult> {
  if (!SECRET_KEY) {
    return simulatePayment(amount, 'CARD');
  }

  const body = {
    data: {
      attributes: {
        amount: Math.round(amount * 100),
        payment_method_types: ['card'],
        currency: 'PHP',
        description,
        capture_type: 'automatic',
      },
    },
  };

  const resp = await paymongoRequest<any>('POST', '/v1/payment_intents', body);
  const intent = resp?.data;

  // For card payments, return the client key as checkout URL
  // The frontend needs to handle 3DS challenge using PayMongo.js
  return {
    paymentIntentId: intent?.id,
    checkoutUrl: `https://checkout.paymongo.com/intent/${intent?.id}?client_key=${intent?.attributes?.client_key}`,
    status: 'pending',
    isSimulated: false,
  };
}

// ── Verify webhook signature ───────────────────────────────────────────────────
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!process.env['PAYMONGO_WEBHOOK_SECRET']) return true; // Skip if not configured
  const crypto = require('crypto');
  const expected = crypto
    .createHmac('sha256', process.env['PAYMONGO_WEBHOOK_SECRET'])
    .update(rawBody)
    .digest('hex');
  return signature === expected;
}

// ── Get payment intent status ─────────────────────────────────────────────────
export async function getPaymentStatus(paymentIntentId: string): Promise<string> {
  if (!SECRET_KEY || paymentIntentId.startsWith('SIM-') || paymentIntentId.startsWith('PI-')) {
    return 'pending'; // Simulated intents are polled by frontend
  }

  try {
    const isLink = paymentIntentId.startsWith('link_');
    const path = isLink ? `/v1/links/${paymentIntentId}` : `/v1/payment_intents/${paymentIntentId}`;
    const resp = await paymongoRequest<any>('GET', path);
    return resp?.data?.attributes?.status ?? 'pending';
  } catch {
    return 'pending';
  }
}

// ── Simulation fallback ────────────────────────────────────────────────────────
function simulatePayment(amount: number, method: string): PaymongoLinkResult {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const intentId = `SIM-${method}-${date}-${rand}`;
  return {
    paymentIntentId: intentId,
    checkoutUrl: `https://demo-checkout.ihims.ph/pay/${intentId}?amount=${amount}`,
    status: 'pending',
    isSimulated: true,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function initiateGcashPayment(amount: number, description: string): Promise<PaymongoLinkResult> {
  return createPaymentLink(amount, description, 'gcash');
}

export async function initiateMayaPayment(amount: number, description: string): Promise<PaymongoLinkResult> {
  return createPaymentLink(amount, description, 'paymaya');
}

export async function initiateCardPayment(amount: number, description: string): Promise<PaymongoLinkResult> {
  return createCardPaymentIntent(amount, description);
}

export const isPaymongoEnabled = (): boolean => !!SECRET_KEY;
