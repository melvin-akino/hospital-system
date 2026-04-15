/**
 * HMO API Service — Adapter-based integration layer
 *
 * Supports real API calls to HMO companies when credentials are configured,
 * with graceful simulation fallback.
 *
 * Per-HMO credentials are stored as environment variables:
 *
 *   MAXICARE_API_URL        https://api.maxicare.com.ph/v1
 *   MAXICARE_CLIENT_ID      OAuth2 client_id
 *   MAXICARE_CLIENT_SECRET  OAuth2 client_secret
 *   MAXICARE_FACILITY_CODE  Provider/facility accreditation code
 *
 *   PHILAM_API_URL          https://api.philamlife.com/hmo/v2
 *   PHILAM_API_KEY          API key header value
 *   PHILAM_FACILITY_CODE    Provider code
 *
 *   INTELLICARE_API_URL     https://api.intellicare.com.ph/v1
 *   INTELLICARE_API_KEY     API key
 *   INTELLICARE_FACILITY_CODE
 *
 * For any HMO whose credentials are not present, the service falls back to
 * the local-DB simulation already implemented in the controller.
 */

import https from 'https';
import http from 'http';

// ── Config helpers ─────────────────────────────────────────────────────────────

export type HmoCode = 'MAXICARE' | 'PHILAM' | 'INTELLICARE' | string;

interface HmoApiConfig {
  apiUrl:       string;
  facilityCode: string;
  clientId?:    string;
  secret?:      string;
  apiKey?:      string;
}

function getHmoConfig(hmoCode: string): HmoApiConfig | null {
  const code = hmoCode.toUpperCase();

  const cfg: Record<string, HmoApiConfig> = {};

  if (
    process.env['MAXICARE_API_URL'] &&
    process.env['MAXICARE_FACILITY_CODE']
  ) {
    cfg['MAXICARE'] = {
      apiUrl:       process.env['MAXICARE_API_URL']!,
      facilityCode: process.env['MAXICARE_FACILITY_CODE']!,
      clientId:     process.env['MAXICARE_CLIENT_ID'],
      secret:       process.env['MAXICARE_CLIENT_SECRET'],
    };
  }

  if (
    process.env['PHILAM_API_URL'] &&
    process.env['PHILAM_API_KEY'] &&
    process.env['PHILAM_FACILITY_CODE']
  ) {
    cfg['PHILAM'] = {
      apiUrl:       process.env['PHILAM_API_URL']!,
      facilityCode: process.env['PHILAM_FACILITY_CODE']!,
      apiKey:       process.env['PHILAM_API_KEY'],
    };
  }

  if (
    process.env['INTELLICARE_API_URL'] &&
    process.env['INTELLICARE_API_KEY'] &&
    process.env['INTELLICARE_FACILITY_CODE']
  ) {
    cfg['INTELLICARE'] = {
      apiUrl:       process.env['INTELLICARE_API_URL']!,
      facilityCode: process.env['INTELLICARE_FACILITY_CODE']!,
      apiKey:       process.env['INTELLICARE_API_KEY'],
    };
  }

  return cfg[code] ?? null;
}

export function isHmoApiEnabled(hmoCode: string): boolean {
  return getHmoConfig(hmoCode) !== null;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

// Simple OAuth2 token cache (in-memory, per HMO code)
const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

async function getOAuthToken(config: HmoApiConfig, hmoCode: string): Promise<string | null> {
  if (!config.clientId || !config.secret) return null;

  const cached = tokenCache[hmoCode];
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  try {
    const body = `grant_type=client_credentials&client_id=${encodeURIComponent(config.clientId)}&client_secret=${encodeURIComponent(config.secret)}`;
    const res = await hmoRequest<{ access_token: string; expires_in?: number }>(
      config.apiUrl,
      null,
      'POST',
      '/oauth/token',
      body,
      { 'Content-Type': 'application/x-www-form-urlencoded' },
    );
    if (res.ok && res.data.access_token) {
      tokenCache[hmoCode] = {
        token:     res.data.access_token,
        expiresAt: Date.now() + (res.data.expires_in ?? 3600) * 1000,
      };
      return res.data.access_token;
    }
  } catch {
    // ignore
  }
  return null;
}

function hmoRequest<T>(
  baseUrl: string,
  config: HmoApiConfig | null,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const apiUrl = (baseUrl || (config?.apiUrl ?? '')).replace(/\/$/, '');
    const url = new URL(apiUrl + path);
    const isJson = body && typeof body !== 'string';
    const payload = isJson ? JSON.stringify(body) : (body as string | undefined);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...extraHeaders,
    };

    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }

    if (payload) {
      headers['Content-Length'] = String(Buffer.byteLength(payload));
    }

    if (config?.apiKey) {
      headers['X-API-Key'] = config.apiKey;
    }

    if (config?.facilityCode) {
      headers['X-Facility-Code'] = config.facilityCode;
    }

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port:     url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers,
    };

    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
      res.on('end', () => {
        try {
          resolve({ ok: (res.statusCode ?? 500) < 400, status: res.statusCode ?? 500, data: JSON.parse(raw) as T });
        } catch {
          resolve({ ok: false, status: res.statusCode ?? 500, data: raw as unknown as T });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HmoEligibilityResult {
  eligible:        boolean;
  memberNo:        string | null;
  memberName:      string | null;
  plan:            string | null;
  coverageDetails: Record<string, unknown>;
  validUntil:      string | null;
  hmoName:         string;
  isSimulated:     boolean;
}

export interface HmoAuthorizationResult {
  authorizationNo: string;
  approvedAmount:  number;
  validUntil:      string;
  conditions:      string[];
  isSimulated:     boolean;
}

export interface HmoClaimSubmitResult {
  success:      boolean;
  referenceNo:  string;
  status:       string;
  message:      string;
  isSimulated:  boolean;
}

export interface HmoClaimStatusResult {
  referenceNo:   string;
  status:        string;
  remarks:       string | null;
  approvedAmount: number | null;
  processedAt:   string | null;
  isSimulated:   boolean;
}

// ── Eligibility ───────────────────────────────────────────────────────────────

/**
 * Attempt a real HMO eligibility check.  Returns null if the HMO has no
 * API credentials configured (controller falls back to DB check).
 */
export async function checkHmoEligibility(
  hmoCode: string,
  hmoName: string,
  memberNo: string,
  patientName: string,
): Promise<HmoEligibilityResult | null> {
  const config = getHmoConfig(hmoCode);
  if (!config) return null; // caller handles simulation

  try {
    const token = await getOAuthToken(config, hmoCode);
    if (token) {
      // Inject bearer token
      Object.assign(config, { _bearerToken: token });
    }

    const endpoint = hmoCode === 'MAXICARE'
      ? `/eligibility?memberNo=${encodeURIComponent(memberNo)}&facilityCode=${encodeURIComponent(config.facilityCode)}`
      : hmoCode === 'PHILAM'
        ? `/members/${encodeURIComponent(memberNo)}/eligibility`
        : `/eligibility/check?memberNo=${encodeURIComponent(memberNo)}`;

    const extraHeaders: Record<string, string> = {};
    if ((config as Record<string, unknown>)['_bearerToken']) {
      extraHeaders['Authorization'] = `Bearer ${(config as Record<string, unknown>)['_bearerToken'] as string}`;
    }

    const res = await hmoRequest<Record<string, unknown>>(
      config.apiUrl, config, 'GET', endpoint, undefined, extraHeaders,
    );

    if (!res.ok) return null;

    // Normalize different HMO response shapes
    return normalizeEligibilityResponse(hmoCode, hmoName, memberNo, res.data);
  } catch {
    return null; // degrade to simulation
  }
}

function normalizeEligibilityResponse(
  hmoCode: string,
  hmoName: string,
  memberNo: string,
  raw: Record<string, unknown>,
): HmoEligibilityResult {
  if (hmoCode === 'MAXICARE') {
    const eligible = raw['eligibilityStatus'] === 'ACTIVE';
    const benefit = (raw['benefit'] as Record<string, unknown>) ?? {};
    return {
      eligible,
      memberNo,
      memberName: (raw['memberName'] as string) ?? null,
      plan:       (benefit['planName'] as string) ?? null,
      coverageDetails: raw,
      validUntil: (raw['coverageEndDate'] as string) ?? null,
      hmoName,
      isSimulated: false,
    };
  }

  if (hmoCode === 'PHILAM') {
    const eligible = raw['status'] === 'eligible';
    const coverage = (raw['coverage'] as Record<string, unknown>) ?? {};
    return {
      eligible,
      memberNo,
      memberName: (raw['name'] as string) ?? null,
      plan:       (coverage['plan'] as string) ?? null,
      coverageDetails: raw,
      validUntil: (raw['expiryDate'] as string) ?? null,
      hmoName,
      isSimulated: false,
    };
  }

  // Generic
  const eligible = !!(raw['eligible'] ?? raw['isEligible'] ?? raw['status'] === 'ACTIVE');
  return {
    eligible,
    memberNo,
    memberName: (raw['memberName'] as string) ?? null,
    plan:       (raw['plan'] as string) ?? (raw['planName'] as string) ?? null,
    coverageDetails: raw,
    validUntil: (raw['validUntil'] as string) ?? (raw['expiryDate'] as string) ?? null,
    hmoName,
    isSimulated: false,
  };
}

// ── Authorization ─────────────────────────────────────────────────────────────

export async function requestHmoAuthorization(
  hmoCode: string,
  hmoName: string,
  payload: {
    memberNo:         string;
    patientName:      string;
    procedureCodes:   string[];
    diagnosis:        string | null;
    estimatedAmount:  number;
  },
): Promise<HmoAuthorizationResult | null> {
  const config = getHmoConfig(hmoCode);
  if (!config) return null;

  const now      = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30);

  try {
    const token = await getOAuthToken(config, hmoCode);
    const extraHeaders: Record<string, string> = {};
    if (token) extraHeaders['Authorization'] = `Bearer ${token}`;

    const body = {
      facilityCode:    config.facilityCode,
      memberNo:        payload.memberNo,
      procedureCodes:  payload.procedureCodes,
      diagnosis:       payload.diagnosis,
      estimatedAmount: payload.estimatedAmount,
    };

    const res = await hmoRequest<Record<string, unknown>>(
      config.apiUrl, config, 'POST', '/authorization/request', body, extraHeaders,
    );

    if (!res.ok) return null;

    const d = res.data;
    return {
      authorizationNo: (d['authorizationNo'] as string) ?? (d['authNo'] as string) ?? generateRefNo(hmoCode),
      approvedAmount:  (d['approvedAmount'] as number)  ?? Math.round(payload.estimatedAmount * 0.95 * 100) / 100,
      validUntil:      (d['validUntil']     as string)  ?? validUntil.toISOString().split('T')[0]!,
      conditions:      (d['conditions']     as string[]) ?? [],
      isSimulated:     false,
    };
  } catch {
    return null;
  }
}

// ── Claim Submission ──────────────────────────────────────────────────────────

export async function submitHmoClaim(
  hmoCode: string,
  hmoName: string,
  payload: {
    claimNo:         string;
    memberNo:        string;
    patientName:     string;
    diagnosis:       string | null;
    claimAmount:     number;
    authorizationNo?: string;
  },
): Promise<HmoClaimSubmitResult | null> {
  const config = getHmoConfig(hmoCode);
  if (!config) return null;

  try {
    const token = await getOAuthToken(config, hmoCode);
    const extraHeaders: Record<string, string> = {};
    if (token) extraHeaders['Authorization'] = `Bearer ${token}`;

    const body = {
      facilityCode:    config.facilityCode,
      claimNo:         payload.claimNo,
      memberNo:        payload.memberNo,
      diagnosis:       payload.diagnosis,
      claimAmount:     payload.claimAmount,
      authorizationNo: payload.authorizationNo ?? null,
    };

    const res = await hmoRequest<Record<string, unknown>>(
      config.apiUrl, config, 'POST', '/claims/submit', body, extraHeaders,
    );

    if (!res.ok) return null;

    const d = res.data;
    const refNo = (d['referenceNo'] as string) ?? (d['claimReferenceNo'] as string) ?? generateRefNo(hmoCode);

    return {
      success:     true,
      referenceNo: refNo,
      status:      (d['status'] as string) ?? 'RECEIVED',
      message:     (d['message'] as string) ?? `Claim submitted to ${hmoName}. Ref: ${refNo}`,
      isSimulated: false,
    };
  } catch {
    return null;
  }
}

// ── Claim Status ──────────────────────────────────────────────────────────────

export async function getHmoClaimStatus(
  hmoCode: string,
  referenceNo: string,
): Promise<HmoClaimStatusResult | null> {
  const config = getHmoConfig(hmoCode);
  if (!config) return null;

  try {
    const token = await getOAuthToken(config, hmoCode);
    const extraHeaders: Record<string, string> = {};
    if (token) extraHeaders['Authorization'] = `Bearer ${token}`;

    const res = await hmoRequest<Record<string, unknown>>(
      config.apiUrl, config,
      'GET', `/claims/${encodeURIComponent(referenceNo)}/status`,
      undefined, extraHeaders,
    );

    if (!res.ok) return null;

    const d = res.data;
    return {
      referenceNo,
      status:        (d['status']        as string)  ?? 'PROCESSING',
      remarks:       (d['remarks']       as string)  ?? null,
      approvedAmount: (d['approvedAmount'] as number) ?? null,
      processedAt:   (d['processedAt']   as string)  ?? null,
      isSimulated:   false,
    };
  } catch {
    return null;
  }
}

// ── Ref number helpers ────────────────────────────────────────────────────────

export function generateRefNo(hmoCode: string): string {
  const code = hmoCode.toUpperCase().slice(0, 3);
  const yr   = new Date().getFullYear();
  const seq  = String(Math.floor(Math.random() * 9_999_999)).padStart(7, '0');
  return `${code}-${yr}-${seq}`;
}
