/**
 * Tests for admissions-related calculation and business logic.
 * Pure function tests — no DB, no HTTP calls.
 */

// ── Room charge calculations ───────────────────────────────────────────────────

function calculateRoomCharge(
  ratePerDay: number,
  admittedAt: Date,
  dischargedAt: Date
): { days: number; totalCharge: number } {
  const msPerDay = 1000 * 60 * 60 * 24;
  const rawDays = (dischargedAt.getTime() - admittedAt.getTime()) / msPerDay;
  const days = Math.max(1, Math.ceil(rawDays)); // minimum 1 day
  return { days, totalCharge: days * ratePerDay };
}

// ── Admission number generation format ────────────────────────────────────────

function formatAdmissionNo(count: number): string {
  return `ADM-${String(count).padStart(6, '0')}`;
}

// ── Bill number generation format ─────────────────────────────────────────────

function formatBillNo(count: number): string {
  return `BILL-${String(count).padStart(6, '0')}`;
}

// ── Discharge duration (length of stay) calculation ───────────────────────────

function calculateLengthOfStay(admittedAt: Date, dischargedAt: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((dischargedAt.getTime() - admittedAt.getTime()) / msPerDay);
}

// ── Consent default generation ────────────────────────────────────────────────

const DEFAULT_CONSENTS = [
  { consentType: 'GENERAL_TREATMENT', isRequired: true },
  { consentType: 'FINANCIAL_RESPONSIBILITY', isRequired: true },
  { consentType: 'DATA_PRIVACY', isRequired: true },
  { consentType: 'BLOOD_TRANSFUSION', isRequired: false },
  { consentType: 'ANESTHESIA', isRequired: false },
  { consentType: 'SURGERY', isRequired: false },
  { consentType: 'PHOTO_VIDEO', isRequired: false },
];

function getRequiredConsents(): typeof DEFAULT_CONSENTS {
  return DEFAULT_CONSENTS.filter((c) => c.isRequired);
}

function getOptionalConsents(): typeof DEFAULT_CONSENTS {
  return DEFAULT_CONSENTS.filter((c) => !c.isRequired);
}

// ── Document checklist ────────────────────────────────────────────────────────

const DEFAULT_DOCUMENTS = [
  { documentType: 'VALID_ID' },
  { documentType: 'HMO_CARD' },
  { documentType: 'HMO_LOA' },
  { documentType: 'PHILHEALTH_MDR' },
  { documentType: 'SENIOR_ID' },
  { documentType: 'PWD_ID' },
  { documentType: 'REFERRAL_LETTER' },
  { documentType: 'PREV_RECORDS' },
];

// ── Discharge summary status ──────────────────────────────────────────────────

type DischargeCondition = 'IMPROVED' | 'STABLE' | 'TRANSFERRED' | 'ABSCONDED' | 'EXPIRED';

function isPositiveOutcome(condition: DischargeCondition): boolean {
  return ['IMPROVED', 'STABLE'].includes(condition);
}

// ── Senior / PWD discount calculation ────────────────────────────────────────

function applySeniorDiscount(totalAmount: number, isSenior: boolean): number {
  const discountRate = 0.20; // 20% senior/PWD discount
  return isSenior ? totalAmount * (1 - discountRate) : totalAmount;
}

function applyPwdDiscount(totalAmount: number, isPwd: boolean): number {
  const discountRate = 0.20; // 20% PWD discount
  return isPwd ? totalAmount * (1 - discountRate) : totalAmount;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calculateRoomCharge', () => {
  it('calculates charge for exact 3 days', () => {
    const admitted = new Date('2025-01-01T08:00:00.000Z');
    const discharged = new Date('2025-01-04T08:00:00.000Z');
    const result = calculateRoomCharge(1500, admitted, discharged);
    expect(result.days).toBe(3);
    expect(result.totalCharge).toBe(4500);
  });

  it('rounds partial day up (ceil)', () => {
    const admitted = new Date('2025-01-01T08:00:00.000Z');
    const discharged = new Date('2025-01-01T14:00:00.000Z'); // 6 hours = 0.25 days → ceil = 1
    const result = calculateRoomCharge(2000, admitted, discharged);
    expect(result.days).toBe(1);
    expect(result.totalCharge).toBe(2000);
  });

  it('minimum charge is 1 day even for same-day admission/discharge', () => {
    const admitted = new Date('2025-01-01T08:00:00.000Z');
    const discharged = new Date('2025-01-01T09:00:00.000Z');
    const result = calculateRoomCharge(3000, admitted, discharged);
    expect(result.days).toBeGreaterThanOrEqual(1);
    expect(result.totalCharge).toBeGreaterThanOrEqual(3000);
  });

  it('calculates charge for 7-day stay (one week)', () => {
    const admitted = new Date('2025-01-01T00:00:00.000Z');
    const discharged = new Date('2025-01-08T00:00:00.000Z');
    const result = calculateRoomCharge(1200, admitted, discharged);
    expect(result.days).toBe(7);
    expect(result.totalCharge).toBe(8400);
  });
});

describe('formatAdmissionNo', () => {
  it('pads count to 6 digits with ADM- prefix', () => {
    expect(formatAdmissionNo(1)).toBe('ADM-000001');
    expect(formatAdmissionNo(42)).toBe('ADM-000042');
    expect(formatAdmissionNo(99999)).toBe('ADM-099999');
    expect(formatAdmissionNo(100000)).toBe('ADM-100000');
  });

  it('handles large numbers correctly', () => {
    expect(formatAdmissionNo(1000000)).toBe('ADM-1000000');
  });
});

describe('formatBillNo', () => {
  it('pads count to 6 digits with BILL- prefix', () => {
    expect(formatBillNo(1)).toBe('BILL-000001');
    expect(formatBillNo(500)).toBe('BILL-000500');
  });
});

describe('calculateLengthOfStay', () => {
  it('calculates whole day LOS', () => {
    const admitted = new Date('2025-03-10T00:00:00.000Z');
    const discharged = new Date('2025-03-15T00:00:00.000Z');
    expect(calculateLengthOfStay(admitted, discharged)).toBe(5);
  });

  it('rounds up partial day to full day', () => {
    const admitted = new Date('2025-03-10T08:00:00.000Z');
    const discharged = new Date('2025-03-10T20:00:00.000Z'); // 12h
    expect(calculateLengthOfStay(admitted, discharged)).toBe(1);
  });

  it('returns 1 for same-day admission and discharge', () => {
    const now = new Date('2025-03-10T10:00:00.000Z');
    expect(calculateLengthOfStay(now, new Date('2025-03-10T12:00:00.000Z'))).toBe(1);
  });
});

describe('DEFAULT_CONSENTS structure', () => {
  it('has exactly 7 default consent types', () => {
    expect(DEFAULT_CONSENTS).toHaveLength(7);
  });

  it('has 3 required consents', () => {
    expect(getRequiredConsents()).toHaveLength(3);
  });

  it('required consents include GENERAL_TREATMENT, FINANCIAL_RESPONSIBILITY, DATA_PRIVACY', () => {
    const types = getRequiredConsents().map((c) => c.consentType);
    expect(types).toContain('GENERAL_TREATMENT');
    expect(types).toContain('FINANCIAL_RESPONSIBILITY');
    expect(types).toContain('DATA_PRIVACY');
  });

  it('has 4 optional consents', () => {
    expect(getOptionalConsents()).toHaveLength(4);
  });

  it('optional consents include SURGERY, ANESTHESIA, BLOOD_TRANSFUSION, PHOTO_VIDEO', () => {
    const types = getOptionalConsents().map((c) => c.consentType);
    expect(types).toContain('SURGERY');
    expect(types).toContain('ANESTHESIA');
    expect(types).toContain('BLOOD_TRANSFUSION');
    expect(types).toContain('PHOTO_VIDEO');
  });
});

describe('DEFAULT_DOCUMENTS structure', () => {
  it('has exactly 8 default document types', () => {
    expect(DEFAULT_DOCUMENTS).toHaveLength(8);
  });

  it('includes VALID_ID and PHILHEALTH_MDR', () => {
    const types = DEFAULT_DOCUMENTS.map((d) => d.documentType);
    expect(types).toContain('VALID_ID');
    expect(types).toContain('PHILHEALTH_MDR');
  });

  it('includes HMO_LOA for HMO patients', () => {
    const types = DEFAULT_DOCUMENTS.map((d) => d.documentType);
    expect(types).toContain('HMO_LOA');
  });
});

describe('isPositiveOutcome — discharge condition', () => {
  it('IMPROVED is a positive outcome', () => {
    expect(isPositiveOutcome('IMPROVED')).toBe(true);
  });

  it('STABLE is a positive outcome', () => {
    expect(isPositiveOutcome('STABLE')).toBe(true);
  });

  it('EXPIRED is not a positive outcome', () => {
    expect(isPositiveOutcome('EXPIRED')).toBe(false);
  });

  it('TRANSFERRED is not a positive outcome', () => {
    expect(isPositiveOutcome('TRANSFERRED')).toBe(false);
  });

  it('ABSCONDED is not a positive outcome', () => {
    expect(isPositiveOutcome('ABSCONDED')).toBe(false);
  });
});

describe('applySeniorDiscount', () => {
  it('applies 20% discount for senior citizens', () => {
    expect(applySeniorDiscount(10000, true)).toBe(8000);
  });

  it('applies no discount for non-senior patients', () => {
    expect(applySeniorDiscount(10000, false)).toBe(10000);
  });

  it('handles zero amount', () => {
    expect(applySeniorDiscount(0, true)).toBe(0);
  });

  it('calculates correct discount on partial amounts', () => {
    expect(applySeniorDiscount(5000, true)).toBe(4000);
  });
});

describe('applyPwdDiscount', () => {
  it('applies 20% discount for PWD patients', () => {
    expect(applyPwdDiscount(10000, true)).toBe(8000);
  });

  it('applies no discount for non-PWD patients', () => {
    expect(applyPwdDiscount(10000, false)).toBe(10000);
  });
});
