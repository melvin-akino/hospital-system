/**
 * Tests for prescription (Rx) business logic and validation rules.
 * Pure function tests — no DB, no HTTP calls.
 */

// ── Rx number format ──────────────────────────────────────────────────────────

function formatRxNo(year: number, month: number, count: number): string {
  const m = String(month).padStart(2, '0');
  const c = String(count).padStart(4, '0');
  return `RX-${year}${m}-${c}`;
}

// ── Prescription status transitions ──────────────────────────────────────────

type RxStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

function canDispense(status: RxStatus): boolean {
  return status === 'ACTIVE';
}

function canCancelPrescription(status: RxStatus): boolean {
  return status === 'ACTIVE';
}

function isRxExpired(status: RxStatus, prescribedAt: Date, validityDays: number, today: Date): boolean {
  if (status === 'CANCELLED') return false;
  const expiryMs = prescribedAt.getTime() + validityDays * 24 * 60 * 60 * 1000;
  return today.getTime() > expiryMs;
}

// ── Prescription item validation ──────────────────────────────────────────────

interface RxItem {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

function validateRxItem(item: Partial<RxItem>): string[] {
  const errors: string[] = [];
  if (!item.drugName?.trim()) errors.push('drugName is required');
  if (!item.dosage?.trim()) errors.push('dosage is required');
  if (!item.frequency?.trim()) errors.push('frequency is required');
  if (!item.quantity || item.quantity <= 0) errors.push('quantity must be positive');
  return errors;
}

function validatePrescription(patientId: string | undefined, items: unknown[]): string[] {
  const errors: string[] = [];
  if (!patientId) errors.push('patientId is required');
  if (!Array.isArray(items) || items.length === 0) errors.push('At least one prescription item is required');
  return errors;
}

// ── Dosage/frequency helpers ──────────────────────────────────────────────────

const FREQUENCY_MAP: Record<string, string> = {
  OD: 'Once daily',
  BID: 'Twice daily',
  TID: 'Three times daily',
  QID: 'Four times daily',
  Q4H: 'Every 4 hours',
  Q6H: 'Every 6 hours',
  Q8H: 'Every 8 hours',
  PRN: 'As needed',
  STAT: 'Immediately',
};

function expandFrequency(code: string): string {
  return FREQUENCY_MAP[code] ?? code;
}

function calculateTotalQuantity(dosePerAdmin: number, freqPerDay: number, durationDays: number): number {
  return dosePerAdmin * freqPerDay * durationDays;
}

// ── Drug interaction severity ─────────────────────────────────────────────────

type InteractionSeverity = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';

function isSevereInteraction(severity: InteractionSeverity): boolean {
  return ['MAJOR', 'CONTRAINDICATED'].includes(severity);
}

function requiresPhysicianApproval(severity: InteractionSeverity): boolean {
  return isSevereInteraction(severity);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('formatRxNo', () => {
  it('formats Rx number with year, month and padded count', () => {
    expect(formatRxNo(2025, 6, 1)).toBe('RX-202506-0001');
    expect(formatRxNo(2025, 6, 42)).toBe('RX-202506-0042');
    expect(formatRxNo(2025, 12, 9999)).toBe('RX-202512-9999');
  });

  it('pads single-digit months', () => {
    expect(formatRxNo(2025, 1, 1)).toBe('RX-202501-0001');
    expect(formatRxNo(2025, 9, 1)).toBe('RX-202509-0001');
  });
});

describe('canDispense', () => {
  it('allows dispensing ACTIVE prescriptions', () => {
    expect(canDispense('ACTIVE')).toBe(true);
  });

  it('blocks dispensing COMPLETED prescriptions', () => {
    expect(canDispense('COMPLETED')).toBe(false);
  });

  it('blocks dispensing CANCELLED prescriptions', () => {
    expect(canDispense('CANCELLED')).toBe(false);
  });

  it('blocks dispensing EXPIRED prescriptions', () => {
    expect(canDispense('EXPIRED')).toBe(false);
  });
});

describe('canCancelPrescription', () => {
  it('allows cancelling ACTIVE prescriptions', () => {
    expect(canCancelPrescription('ACTIVE')).toBe(true);
  });

  it('does not allow cancelling already CANCELLED ones', () => {
    expect(canCancelPrescription('CANCELLED')).toBe(false);
  });

  it('does not allow cancelling COMPLETED prescriptions', () => {
    expect(canCancelPrescription('COMPLETED')).toBe(false);
  });
});

describe('isRxExpired', () => {
  const prescribedAt = new Date('2025-01-01T00:00:00.000Z');

  it('is not expired if within validity window', () => {
    const today = new Date('2025-01-15T00:00:00.000Z');
    expect(isRxExpired('ACTIVE', prescribedAt, 30, today)).toBe(false);
  });

  it('is expired after validity window', () => {
    const today = new Date('2025-02-05T00:00:00.000Z');
    expect(isRxExpired('ACTIVE', prescribedAt, 30, today)).toBe(true);
  });

  it('CANCELLED prescription is not considered expired', () => {
    const today = new Date('2025-03-01T00:00:00.000Z');
    expect(isRxExpired('CANCELLED', prescribedAt, 30, today)).toBe(false);
  });

  it('expires exactly at validity boundary', () => {
    const today = new Date('2025-01-31T00:00:01.000Z'); // 1 second past 30-day boundary
    expect(isRxExpired('ACTIVE', prescribedAt, 30, today)).toBe(true);
  });
});

describe('validateRxItem', () => {
  const validItem: RxItem = {
    drugName: 'Amoxicillin',
    dosage: '500mg',
    frequency: 'TID',
    duration: '7 days',
    quantity: 21,
  };

  it('returns no errors for a valid item', () => {
    expect(validateRxItem(validItem)).toHaveLength(0);
  });

  it('requires drugName', () => {
    const errors = validateRxItem({ ...validItem, drugName: '' });
    expect(errors).toContain('drugName is required');
  });

  it('requires dosage', () => {
    const errors = validateRxItem({ ...validItem, dosage: '' });
    expect(errors).toContain('dosage is required');
  });

  it('requires frequency', () => {
    const errors = validateRxItem({ ...validItem, frequency: '' });
    expect(errors).toContain('frequency is required');
  });

  it('requires positive quantity', () => {
    const errors = validateRxItem({ ...validItem, quantity: 0 });
    expect(errors).toContain('quantity must be positive');
  });

  it('returns multiple errors for completely empty item', () => {
    const errors = validateRxItem({});
    expect(errors.length).toBeGreaterThan(1);
  });
});

describe('validatePrescription', () => {
  it('requires patientId', () => {
    const errors = validatePrescription(undefined, [{ drugName: 'Paracetamol' }]);
    expect(errors).toContain('patientId is required');
  });

  it('requires at least one item', () => {
    const errors = validatePrescription('patient-123', []);
    expect(errors).toContain('At least one prescription item is required');
  });

  it('returns no errors for valid prescription', () => {
    const errors = validatePrescription('patient-123', [{ drugName: 'Paracetamol' }]);
    expect(errors).toHaveLength(0);
  });
});

describe('expandFrequency', () => {
  it('expands OD to Once daily', () => {
    expect(expandFrequency('OD')).toBe('Once daily');
  });

  it('expands BID to Twice daily', () => {
    expect(expandFrequency('BID')).toBe('Twice daily');
  });

  it('expands PRN to As needed', () => {
    expect(expandFrequency('PRN')).toBe('As needed');
  });

  it('returns the code unchanged for unknown frequencies', () => {
    expect(expandFrequency('Q12H')).toBe('Q12H');
  });
});

describe('calculateTotalQuantity', () => {
  it('calculates quantity for TID × 7 days at 1 tablet per dose', () => {
    expect(calculateTotalQuantity(1, 3, 7)).toBe(21);
  });

  it('calculates quantity for BID × 14 days at 2 tablets per dose', () => {
    expect(calculateTotalQuantity(2, 2, 14)).toBe(56);
  });

  it('calculates for single daily dose for 30 days', () => {
    expect(calculateTotalQuantity(1, 1, 30)).toBe(30);
  });
});

describe('isSevereInteraction / requiresPhysicianApproval', () => {
  it('MAJOR is a severe interaction', () => {
    expect(isSevereInteraction('MAJOR')).toBe(true);
  });

  it('CONTRAINDICATED is a severe interaction', () => {
    expect(isSevereInteraction('CONTRAINDICATED')).toBe(true);
  });

  it('MINOR is not severe', () => {
    expect(isSevereInteraction('MINOR')).toBe(false);
  });

  it('MODERATE is not severe', () => {
    expect(isSevereInteraction('MODERATE')).toBe(false);
  });

  it('CONTRAINDICATED requires physician approval', () => {
    expect(requiresPhysicianApproval('CONTRAINDICATED')).toBe(true);
  });

  it('MINOR does not require physician approval', () => {
    expect(requiresPhysicianApproval('MINOR')).toBe(false);
  });
});
