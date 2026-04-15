/**
 * PhilHealth eClaims API Service
 *
 * Integrates with the PhilHealth eClaims web service when credentials are
 * configured via environment variables.  Falls back to a deterministic
 * simulation otherwise so that the application works out of the box.
 *
 * Required env vars (all optional — simulation used when absent):
 *   PHILHEALTH_API_URL       Base URL of the eClaims REST gateway
 *                            (e.g. https://eclaims.philhealth.gov.ph/api/v2)
 *   PHILHEALTH_FACILITY_CODE Accreditation code of the health facility
 *   PHILHEALTH_API_KEY       API key / bearer token issued by PhilHealth
 */

import https from 'https';
import http from 'http';

// ── Configuration ─────────────────────────────────────────────────────────────

const PH_API_URL   = (process.env['PHILHEALTH_API_URL']       || '').replace(/\/$/, '');
const FACILITY_CODE = process.env['PHILHEALTH_FACILITY_CODE'] || '';
const API_KEY       = process.env['PHILHEALTH_API_KEY']       || '';

export const isPhilHealthEnabled = (): boolean =>
  !!(PH_API_URL && FACILITY_CODE && API_KEY);

// ── HTTP helper ───────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

function phRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const url = new URL(PH_API_URL + path);
    const payload = body ? JSON.stringify(body) : undefined;

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port:     url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Facility-Code': FACILITY_CODE,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
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

export interface PhEligibilityResult {
  eligible: boolean;
  memberName: string | null;
  memberType: string | null;
  status: string;
  coverageStart: string | null;
  coverageEnd: string | null;
  message: string;
  isSimulated: boolean;
}

export interface PhClaimSubmitResult {
  success: boolean;
  transmittalNo: string;
  referenceNo: string;
  status: string;
  message: string;
  isSimulated: boolean;
}

export interface PhClaimStatusResult {
  referenceNo: string;
  status: string;       // RECEIVED | PROCESSING | APPROVED | REJECTED
  remarks: string | null;
  processedAt: string | null;
  approvedAmount: number | null;
  isSimulated: boolean;
}

export interface PhAuthorizationResult {
  authorizationNo: string;
  approvedAmount: number;
  validUntil: string;
  conditions: string[];
  isSimulated: boolean;
}

// ── Eligibility Verification ──────────────────────────────────────────────────

/**
 * POST /eligibility/verify
 * PhilHealth eClaims REST v2 payload (simplified):
 * {
 *   "philhealthNo": "01-000000000-0",
 *   "lastName": "DELA CRUZ",
 *   "dateOfBirth": "1990-01-15",
 *   "facilityCode": "XXXXXXXX"
 * }
 */
export async function verifyPhilHealthEligibility(
  philhealthNo: string,
  lastName: string,
  dateOfBirth: string,
): Promise<PhEligibilityResult> {
  if (!isPhilHealthEnabled()) {
    return simulateEligibility(philhealthNo, lastName);
  }

  try {
    const res = await phRequest<{
      eligible: boolean;
      memberName?: string;
      memberType?: string;
      coverageStatus?: string;
      coverageStartDate?: string;
      coverageEndDate?: string;
      message?: string;
    }>('POST', '/eligibility/verify', {
      philhealthNo,
      lastName: lastName.toUpperCase(),
      dateOfBirth,
      facilityCode: FACILITY_CODE,
    });

    if (!res.ok) {
      // API returned an error — fall through to simulation
      throw new Error(`PhilHealth API error: ${res.status}`);
    }

    const d = res.data;
    return {
      eligible:      d.eligible ?? false,
      memberName:    d.memberName ?? null,
      memberType:    d.memberType ?? null,
      status:        d.coverageStatus ?? (d.eligible ? 'ACTIVE' : 'INACTIVE'),
      coverageStart: d.coverageStartDate ?? null,
      coverageEnd:   d.coverageEndDate   ?? null,
      message:       d.message ?? (d.eligible
        ? 'Patient is eligible for PhilHealth benefits.'
        : 'Patient is not eligible.'),
      isSimulated: false,
    };
  } catch {
    // Network or parse error — degrade gracefully to simulation
    return simulateEligibility(philhealthNo, lastName);
  }
}

function simulateEligibility(
  philhealthNo: string,
  lastName: string,
): PhEligibilityResult {
  // Deterministic: numbers starting with '0' → not found simulation
  if (philhealthNo.startsWith('00')) {
    return {
      eligible: false,
      memberName: null,
      memberType: null,
      status: 'NOT_FOUND',
      coverageStart: null,
      coverageEnd: null,
      message: 'Simulated: PhilHealth member not found.',
      isSimulated: true,
    };
  }

  const year = new Date().getFullYear();
  return {
    eligible: true,
    memberName: `${lastName.toUpperCase()}, MEMBER`,
    memberType: 'EMPLOYED',
    status: 'ACTIVE',
    coverageStart: `${year}-01-01`,
    coverageEnd:   `${year}-12-31`,
    message: 'Simulated: Patient is eligible for PhilHealth benefits.',
    isSimulated: true,
  };
}

// ── Claim Submission ──────────────────────────────────────────────────────────

/**
 * POST /claims/submit
 * PhilHealth eClaims REST v2 payload (simplified):
 * {
 *   "facilityCode": "XXXXXXXX",
 *   "claimNo": "PIBS-20240001",
 *   "philhealthNo": "01-000000000-0",
 *   "patientLastName": "DELA CRUZ",
 *   "admissionDate": "2024-01-01",
 *   "dischargeDate": "2024-01-05",
 *   "principalDiagnosis": "A09",
 *   "claimAmount": 15000.00,
 *   "caseRateCode": "Z380"       // optional
 * }
 */
export async function submitPhilHealthClaim(payload: {
  claimNo: string;
  philhealthNo: string | null;
  patientLastName: string;
  patientFirstName: string;
  admissionDate?: string;
  dischargeDate?: string;
  principalDiagnosis?: string;
  claimAmount: number;
  caseRateCode?: string;
}): Promise<PhClaimSubmitResult> {
  const transmittalNo = generateTransmittalNo();

  if (!isPhilHealthEnabled()) {
    return {
      success: true,
      transmittalNo,
      referenceNo: transmittalNo,
      status: 'RECEIVED',
      message: `Simulated: Claim accepted. Transmittal No: ${transmittalNo}`,
      isSimulated: true,
    };
  }

  try {
    const res = await phRequest<{
      success?: boolean;
      transmittalNo?: string;
      referenceNo?: string;
      status?: string;
      message?: string;
    }>('POST', '/claims/submit', {
      facilityCode:      FACILITY_CODE,
      claimNo:           payload.claimNo,
      philhealthNo:      payload.philhealthNo,
      patientLastName:   payload.patientLastName.toUpperCase(),
      patientFirstName:  payload.patientFirstName.toUpperCase(),
      admissionDate:     payload.admissionDate ?? null,
      dischargeDate:     payload.dischargeDate ?? null,
      principalDiagnosis: payload.principalDiagnosis ?? null,
      claimAmount:       payload.claimAmount,
      caseRateCode:      payload.caseRateCode ?? null,
    });

    if (!res.ok) throw new Error(`PhilHealth API error ${res.status}`);

    const d = res.data;
    const phTransmittal = d.transmittalNo || d.referenceNo || transmittalNo;

    return {
      success:       true,
      transmittalNo: phTransmittal,
      referenceNo:   d.referenceNo ?? phTransmittal,
      status:        d.status ?? 'RECEIVED',
      message:       d.message ?? `Claim submitted. Transmittal No: ${phTransmittal}`,
      isSimulated:   false,
    };
  } catch {
    // Degrade to simulation on network failure
    return {
      success:       true,
      transmittalNo,
      referenceNo:   transmittalNo,
      status:        'RECEIVED',
      message:       `Simulated (API unavailable): Transmittal No: ${transmittalNo}`,
      isSimulated:   true,
    };
  }
}

// ── Claim Status Inquiry ──────────────────────────────────────────────────────

/**
 * GET /claims/{referenceNo}/status
 */
export async function getPhilHealthClaimStatus(
  referenceNo: string,
): Promise<PhClaimStatusResult> {
  if (!isPhilHealthEnabled()) {
    return simulateClaimStatus(referenceNo);
  }

  try {
    const res = await phRequest<{
      status?: string;
      remarks?: string;
      processedAt?: string;
      approvedAmount?: number;
    }>('GET', `/claims/${encodeURIComponent(referenceNo)}/status`);

    if (!res.ok) throw new Error(`API error ${res.status}`);

    const d = res.data;
    return {
      referenceNo,
      status:        d.status        ?? 'PROCESSING',
      remarks:       d.remarks       ?? null,
      processedAt:   d.processedAt   ?? null,
      approvedAmount: d.approvedAmount ?? null,
      isSimulated:   false,
    };
  } catch {
    return simulateClaimStatus(referenceNo);
  }
}

function simulateClaimStatus(referenceNo: string): PhClaimStatusResult {
  // Extract timestamp from transmittal no to simulate aging
  const parts = referenceNo.split('-');
  const ageSeconds = Date.now() / 1000 - (parseInt(parts[parts.length - 1] ?? '0', 10) || 0);

  const status = ageSeconds > 3600 ? 'APPROVED' : ageSeconds > 300 ? 'PROCESSING' : 'RECEIVED';

  return {
    referenceNo,
    status,
    remarks:       status === 'APPROVED' ? 'Claim approved for payment.' : null,
    processedAt:   status === 'APPROVED' ? new Date().toISOString() : null,
    approvedAmount: null,
    isSimulated:   true,
  };
}

// ── Prior Authorization ───────────────────────────────────────────────────────

/**
 * POST /authorization/request
 */
export async function requestPhilHealthAuthorization(payload: {
  philhealthNo: string | null;
  patientLastName: string;
  caseRateCode?: string;
  principalDiagnosis?: string;
  estimatedAmount: number;
  admissionDate?: string;
}): Promise<PhAuthorizationResult> {
  const authNo = generateAuthNo();
  const baseDate = payload.admissionDate ? new Date(payload.admissionDate) : new Date();
  const validUntil = new Date(baseDate);
  validUntil.setDate(validUntil.getDate() + 30);
  const validUntilStr = validUntil.toISOString().split('T')[0]!;

  if (!isPhilHealthEnabled()) {
    const approvedAmount = Math.round(payload.estimatedAmount * 0.8 * 100) / 100;
    return {
      authorizationNo: authNo,
      approvedAmount,
      validUntil: validUntilStr,
      conditions: [
        'Pre-authorization valid for 30 days from admission date.',
        'Actual claim must be filed within 60 days of discharge.',
        'Final benefit subject to audit and verification.',
        '(Simulated — PhilHealth API credentials not configured)',
      ],
      isSimulated: true,
    };
  }

  try {
    const res = await phRequest<{
      authorizationNo?: string;
      approvedAmount?: number;
      validUntil?: string;
      conditions?: string[];
    }>('POST', '/authorization/request', {
      facilityCode:      FACILITY_CODE,
      philhealthNo:      payload.philhealthNo,
      patientLastName:   payload.patientLastName.toUpperCase(),
      caseRateCode:      payload.caseRateCode      ?? null,
      principalDiagnosis: payload.principalDiagnosis ?? null,
      estimatedAmount:   payload.estimatedAmount,
      admissionDate:     payload.admissionDate ?? null,
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);

    const d = res.data;
    return {
      authorizationNo: d.authorizationNo ?? authNo,
      approvedAmount:  d.approvedAmount  ?? Math.round(payload.estimatedAmount * 0.8 * 100) / 100,
      validUntil:      d.validUntil      ?? validUntilStr,
      conditions:      d.conditions      ?? [],
      isSimulated:     false,
    };
  } catch {
    const approvedAmount = Math.round(payload.estimatedAmount * 0.8 * 100) / 100;
    return {
      authorizationNo: authNo,
      approvedAmount,
      validUntil: validUntilStr,
      conditions: [
        'Pre-authorization valid for 30 days from admission date.',
        'Actual claim must be filed within 60 days of discharge.',
        'Final benefit subject to audit and verification.',
        '(Generated locally — PhilHealth API temporarily unavailable)',
      ],
      isSimulated: true,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateTransmittalNo(): string {
  const now   = new Date();
  const yr    = now.getFullYear();
  const mo    = String(now.getMonth() + 1).padStart(2, '0');
  const seq   = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  const ts    = String(Math.floor(Date.now() / 1000)).slice(-6);
  return `PH-TRN-${yr}${mo}-${seq}-${ts}`;
}

function generateAuthNo(): string {
  const now   = new Date();
  const yr    = now.getFullYear();
  const mo    = String(now.getMonth() + 1).padStart(2, '0');
  const seq   = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  return `PH-AUTH-${yr}${mo}-${seq}`;
}
