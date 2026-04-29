/**
 * Tests for patient portal authentication logic.
 * Pure function tests — no DB, no HTTP calls.
 */

// ── Date-of-birth comparison logic (mirrors patient-portal.controller.ts login) ─

function normaliseDob(value: string): string {
  return new Date(value).toISOString().split('T')[0];
}

function dobMatches(inputDob: string, storedDob: string): boolean {
  try {
    return normaliseDob(inputDob) === normaliseDob(storedDob);
  } catch {
    return false;
  }
}

// ── Appointment filtering helpers (mirrors PortalDashboard / Appointments page) ─

const APT_UPCOMING_STATUSES = ['SCHEDULED', 'CONFIRMED'];

function isUpcoming(status: string, scheduledAt: Date, now: Date): boolean {
  return APT_UPCOMING_STATUSES.includes(status) && scheduledAt > now;
}

function filterUpcoming(
  appointments: Array<{ status: string; scheduledAt: Date }>,
  now: Date
): Array<{ status: string; scheduledAt: Date }> {
  return appointments.filter((a) => isUpcoming(a.status, a.scheduledAt, now));
}

// ── Balance calculation (mirrors PortalDashboard.tsx totalDue) ────────────────

function calcUnpaidBalance(bills: Array<{ totalAmount: number; amountPaid?: number }>): number {
  return bills.reduce((sum, b) => sum + (b.totalAmount - (b.amountPaid || 0)), 0);
}

function getUnpaidBills(
  bills: Array<{ status: string; totalAmount: number; amountPaid?: number }>
): Array<{ status: string; totalAmount: number; amountPaid?: number }> {
  return bills.filter((b) => ['FINALIZED', 'PARTIAL'].includes(b.status));
}

// ── Portal token payload shape ────────────────────────────────────────────────

interface PortalTokenPayload {
  patientId: string;
  role: 'PATIENT_PORTAL';
}

function buildPortalPayload(patientId: string): PortalTokenPayload {
  return { patientId, role: 'PATIENT_PORTAL' };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('dobMatches — login credential check', () => {
  it('matches identical ISO date strings', () => {
    expect(dobMatches('1990-05-15', '1990-05-15')).toBe(true);
  });

  it('matches regardless of time component', () => {
    expect(dobMatches('1990-05-15', '1990-05-15T00:00:00.000Z')).toBe(true);
  });

  it('does not match different dates', () => {
    expect(dobMatches('1990-05-15', '1990-05-16')).toBe(false);
  });

  it('does not match different years', () => {
    expect(dobMatches('1991-05-15', '1990-05-15')).toBe(false);
  });

  it('does not match different months', () => {
    expect(dobMatches('1990-06-15', '1990-05-15')).toBe(false);
  });

  it('handles slash-format input dates', () => {
    expect(dobMatches('05/15/1990', '1990-05-15')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(dobMatches('', '1990-05-15')).toBe(false);
  });
});

describe('normaliseDob', () => {
  it('returns YYYY-MM-DD from ISO string', () => {
    expect(normaliseDob('1985-03-22T08:00:00.000Z')).toBe('1985-03-22');
  });

  it('returns YYYY-MM-DD from date-only string', () => {
    expect(normaliseDob('2000-12-01')).toBe('2000-12-01');
  });
});

describe('filterUpcoming — appointment tab logic', () => {
  const now = new Date('2025-06-15T08:00:00.000Z');

  it('includes SCHEDULED appointments in the future', () => {
    const apts = [{ status: 'SCHEDULED', scheduledAt: new Date('2025-06-20T09:00:00.000Z') }];
    expect(filterUpcoming(apts, now)).toHaveLength(1);
  });

  it('includes CONFIRMED appointments in the future', () => {
    const apts = [{ status: 'CONFIRMED', scheduledAt: new Date('2025-07-01T09:00:00.000Z') }];
    expect(filterUpcoming(apts, now)).toHaveLength(1);
  });

  it('excludes CANCELLED appointments', () => {
    const apts = [{ status: 'CANCELLED', scheduledAt: new Date('2025-06-20T09:00:00.000Z') }];
    expect(filterUpcoming(apts, now)).toHaveLength(0);
  });

  it('excludes COMPLETED appointments', () => {
    const apts = [{ status: 'COMPLETED', scheduledAt: new Date('2025-06-20T09:00:00.000Z') }];
    expect(filterUpcoming(apts, now)).toHaveLength(0);
  });

  it('excludes future appointments with SCHEDULED status that are actually in the past', () => {
    const apts = [{ status: 'SCHEDULED', scheduledAt: new Date('2025-06-10T09:00:00.000Z') }];
    expect(filterUpcoming(apts, now)).toHaveLength(0);
  });

  it('separates upcoming from past correctly', () => {
    const apts = [
      { status: 'SCHEDULED', scheduledAt: new Date('2025-06-20T09:00:00.000Z') }, // upcoming
      { status: 'CONFIRMED', scheduledAt: new Date('2025-06-25T09:00:00.000Z') }, // upcoming
      { status: 'COMPLETED', scheduledAt: new Date('2025-06-05T09:00:00.000Z') }, // past
      { status: 'CANCELLED', scheduledAt: new Date('2025-06-18T09:00:00.000Z') }, // cancelled
    ];
    expect(filterUpcoming(apts, now)).toHaveLength(2);
  });

  it('returns empty array when no appointments', () => {
    expect(filterUpcoming([], now)).toHaveLength(0);
  });
});

describe('getUnpaidBills — portal billing', () => {
  it('returns only FINALIZED and PARTIAL bills', () => {
    const bills = [
      { status: 'FINALIZED', totalAmount: 3000 },
      { status: 'PARTIAL', totalAmount: 5000, amountPaid: 2000 },
      { status: 'PAID', totalAmount: 1000, amountPaid: 1000 },
      { status: 'DRAFT', totalAmount: 800 },
    ];
    expect(getUnpaidBills(bills)).toHaveLength(2);
  });

  it('returns empty array when all bills are paid', () => {
    const bills = [
      { status: 'PAID', totalAmount: 1000, amountPaid: 1000 },
    ];
    expect(getUnpaidBills(bills)).toHaveLength(0);
  });
});

describe('calcUnpaidBalance — portal dashboard total due', () => {
  it('calculates total unpaid balance across multiple bills', () => {
    const bills = [
      { totalAmount: 5000, amountPaid: 2000 },  // 3000 balance
      { totalAmount: 3000, amountPaid: 0 },       // 3000 balance
      { totalAmount: 1000, amountPaid: 1000 },    // 0 balance
    ];
    expect(calcUnpaidBalance(bills)).toBe(6000);
  });

  it('handles bills with no amountPaid field (defaults to 0)', () => {
    const bills = [{ totalAmount: 2500 }];
    expect(calcUnpaidBalance(bills)).toBe(2500);
  });

  it('returns 0 for empty bills array', () => {
    expect(calcUnpaidBalance([])).toBe(0);
  });

  it('handles fully paid bills correctly', () => {
    const bills = [{ totalAmount: 1000, amountPaid: 1000 }];
    expect(calcUnpaidBalance(bills)).toBe(0);
  });
});

describe('buildPortalPayload — token construction', () => {
  it('always sets role to PATIENT_PORTAL', () => {
    const payload = buildPortalPayload('patient-uuid-xyz');
    expect(payload.role).toBe('PATIENT_PORTAL');
  });

  it('stores the correct patientId', () => {
    const payload = buildPortalPayload('abc-123');
    expect(payload.patientId).toBe('abc-123');
  });
});
