/**
 * Tests for laboratory turnaround time (TAT) calculations and requisition logic.
 * Pure function tests — no DB, no HTTP calls.
 */

// ── TAT thresholds (minutes) per priority ─────────────────────────────────────

const TAT_MINUTES: Record<string, number> = {
  STAT: 60,       // Critical / emergency
  URGENT: 240,    // 4 hours
  ROUTINE: 480,   // 8 hours
};

function getTatTarget(priority: string): number {
  return TAT_MINUTES[priority] ?? TAT_MINUTES['ROUTINE'];
}

function calculateTatMinutes(orderedAt: Date, resultAt: Date): number {
  return Math.round((resultAt.getTime() - orderedAt.getTime()) / (1000 * 60));
}

function isTatBreached(priority: string, orderedAt: Date, resultAt: Date): boolean {
  const target = getTatTarget(priority);
  const actual = calculateTatMinutes(orderedAt, resultAt);
  return actual > target;
}

function getTatStatus(priority: string, orderedAt: Date, resultAt: Date): 'ON_TIME' | 'BREACHED' {
  return isTatBreached(priority, orderedAt, resultAt) ? 'BREACHED' : 'ON_TIME';
}

// ── Requisition number format ─────────────────────────────────────────────────

function formatRequisitionNo(datePrefix: string, count: number): string {
  return `${datePrefix}${String(count).padStart(4, '0')}`;
}

function buildDatePrefix(date: Date, prefix: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${prefix}${y}${m}${d}`;
}

// ── Lab test template lookup ──────────────────────────────────────────────────

const LAB_TEST_TEMPLATES = [
  { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology' },
  { code: 'BMP', name: 'Basic Metabolic Panel', category: 'Chemistry' },
  { code: 'CMP', name: 'Comprehensive Metabolic Panel', category: 'Chemistry' },
  { code: 'LFT', name: 'Liver Function Test', category: 'Chemistry' },
  { code: 'KFT', name: 'Kidney Function Test', category: 'Chemistry' },
  { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Chemistry' },
  { code: 'HBA1C', name: 'HbA1c (Glycated Hemoglobin)', category: 'Chemistry' },
  { code: 'LIPID', name: 'Lipid Profile', category: 'Chemistry' },
  { code: 'UA', name: 'Urinalysis', category: 'Urinalysis' },
  { code: 'UCS', name: 'Urine Culture & Sensitivity', category: 'Microbiology' },
  { code: 'THYROID', name: 'Thyroid Function Test (TSH/T3/T4)', category: 'Endocrinology' },
  { code: 'PREG', name: 'Pregnancy Test (urine hCG)', category: 'Immunology' },
  { code: 'XRAY_PA', name: 'Chest X-Ray PA View', category: 'Radiology' },
  { code: 'XRAY_LAT', name: 'Chest X-Ray Lateral', category: 'Radiology' },
  { code: 'US_ABD', name: 'Ultrasound Whole Abdomen', category: 'Radiology' },
  { code: 'US_OB', name: 'Obstetric Ultrasound', category: 'Radiology' },
  { code: 'CT_HEAD', name: 'CT Scan Head', category: 'Radiology' },
  { code: 'MRI_BRAIN', name: 'MRI Brain', category: 'Radiology' },
];

function findTemplate(code: string) {
  return LAB_TEST_TEMPLATES.find((t) => t.code === code);
}

function getTemplatesByCategory(category: string) {
  return LAB_TEST_TEMPLATES.filter((t) => t.category === category);
}

// ── Abnormal flag logic ───────────────────────────────────────────────────────

function isAbnormalResult(value: number, referenceMin: number, referenceMax: number): boolean {
  return value < referenceMin || value > referenceMax;
}

// ── Result status transitions ─────────────────────────────────────────────────

type ResultStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'CANCELLED';

function canVerifyResult(status: ResultStatus): boolean {
  return status === 'COMPLETED';
}

function canCancelRequisition(status: ResultStatus): boolean {
  return ['PENDING', 'IN_PROGRESS'].includes(status);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getTatTarget — priority thresholds', () => {
  it('STAT TAT target is 60 minutes', () => {
    expect(getTatTarget('STAT')).toBe(60);
  });

  it('URGENT TAT target is 240 minutes (4 hours)', () => {
    expect(getTatTarget('URGENT')).toBe(240);
  });

  it('ROUTINE TAT target is 480 minutes (8 hours)', () => {
    expect(getTatTarget('ROUTINE')).toBe(480);
  });

  it('unknown priority defaults to ROUTINE (480 min)', () => {
    expect(getTatTarget('UNKNOWN')).toBe(480);
  });
});

describe('calculateTatMinutes', () => {
  it('calculates TAT in minutes correctly', () => {
    const ordered = new Date('2025-01-01T08:00:00.000Z');
    const resulted = new Date('2025-01-01T09:30:00.000Z'); // 90 min
    expect(calculateTatMinutes(ordered, resulted)).toBe(90);
  });

  it('returns 0 for same timestamps', () => {
    const t = new Date('2025-01-01T08:00:00.000Z');
    expect(calculateTatMinutes(t, t)).toBe(0);
  });

  it('calculates TAT across day boundary', () => {
    const ordered = new Date('2025-01-01T23:00:00.000Z');
    const resulted = new Date('2025-01-02T02:00:00.000Z'); // 3 hours = 180 min
    expect(calculateTatMinutes(ordered, resulted)).toBe(180);
  });
});

describe('isTatBreached / getTatStatus', () => {
  it('STAT: not breached when result comes in 45 min', () => {
    const ordered = new Date('2025-01-01T08:00:00.000Z');
    const resulted = new Date('2025-01-01T08:45:00.000Z');
    expect(isTatBreached('STAT', ordered, resulted)).toBe(false);
    expect(getTatStatus('STAT', ordered, resulted)).toBe('ON_TIME');
  });

  it('STAT: breached when result comes in 90 min', () => {
    const ordered = new Date('2025-01-01T08:00:00.000Z');
    const resulted = new Date('2025-01-01T09:30:00.000Z');
    expect(isTatBreached('STAT', ordered, resulted)).toBe(true);
    expect(getTatStatus('STAT', ordered, resulted)).toBe('BREACHED');
  });

  it('URGENT: not breached at 3 hours 59 min', () => {
    const ordered = new Date('2025-01-01T08:00:00.000Z');
    const resulted = new Date('2025-01-01T11:59:00.000Z'); // 239 min
    expect(isTatBreached('URGENT', ordered, resulted)).toBe(false);
  });

  it('URGENT: breached at exactly 5 hours', () => {
    const ordered = new Date('2025-01-01T08:00:00.000Z');
    const resulted = new Date('2025-01-01T13:00:00.000Z'); // 300 min
    expect(isTatBreached('URGENT', ordered, resulted)).toBe(true);
  });

  it('ROUTINE: not breached at 7 hours', () => {
    const ordered = new Date('2025-01-01T08:00:00.000Z');
    const resulted = new Date('2025-01-01T15:00:00.000Z'); // 420 min
    expect(isTatBreached('ROUTINE', ordered, resulted)).toBe(false);
  });

  it('ROUTINE: breached at 9 hours', () => {
    const ordered = new Date('2025-01-01T08:00:00.000Z');
    const resulted = new Date('2025-01-01T17:00:00.000Z'); // 540 min
    expect(isTatBreached('ROUTINE', ordered, resulted)).toBe(true);
  });
});

describe('formatRequisitionNo', () => {
  it('pads count to 4 digits after prefix', () => {
    expect(formatRequisitionNo('LAB20250615', 1)).toBe('LAB202506150001');
    expect(formatRequisitionNo('LAB20250615', 42)).toBe('LAB202506150042');
    expect(formatRequisitionNo('LAB20250615', 9999)).toBe('LAB202506159999');
  });
});

describe('buildDatePrefix', () => {
  it('builds correct LAB prefix from date', () => {
    const date = new Date('2025-06-15T00:00:00.000Z');
    expect(buildDatePrefix(date, 'LAB')).toBe('LAB20250615');
  });

  it('builds correct RES prefix from date', () => {
    const date = new Date('2025-12-01T00:00:00.000Z');
    expect(buildDatePrefix(date, 'RES')).toBe('RES20251201');
  });

  it('pads month and day with leading zeros', () => {
    const date = new Date('2025-01-05T00:00:00.000Z');
    expect(buildDatePrefix(date, 'RAD')).toBe('RAD20250105');
  });
});

describe('LAB_TEST_TEMPLATES', () => {
  it('has 18 templates total', () => {
    expect(LAB_TEST_TEMPLATES).toHaveLength(18);
  });

  it('findTemplate returns CBC template', () => {
    const t = findTemplate('CBC');
    expect(t).toBeDefined();
    expect(t!.name).toBe('Complete Blood Count');
    expect(t!.category).toBe('Hematology');
  });

  it('findTemplate returns undefined for unknown code', () => {
    expect(findTemplate('UNKNOWN')).toBeUndefined();
  });

  it('has multiple Chemistry category templates', () => {
    const chemTests = getTemplatesByCategory('Chemistry');
    expect(chemTests.length).toBeGreaterThan(3);
  });

  it('Radiology category includes imaging tests', () => {
    const radTests = getTemplatesByCategory('Radiology');
    const codes = radTests.map((t) => t.code);
    expect(codes).toContain('CT_HEAD');
    expect(codes).toContain('MRI_BRAIN');
    expect(codes).toContain('XRAY_PA');
  });
});

describe('isAbnormalResult', () => {
  it('flags value below reference range as abnormal', () => {
    expect(isAbnormalResult(3.5, 4.0, 10.0)).toBe(true);
  });

  it('flags value above reference range as abnormal', () => {
    expect(isAbnormalResult(15.0, 4.0, 10.0)).toBe(true);
  });

  it('normal value within range returns false', () => {
    expect(isAbnormalResult(7.0, 4.0, 10.0)).toBe(false);
  });

  it('exactly at lower bound is normal', () => {
    expect(isAbnormalResult(4.0, 4.0, 10.0)).toBe(false);
  });

  it('exactly at upper bound is normal', () => {
    expect(isAbnormalResult(10.0, 4.0, 10.0)).toBe(false);
  });
});

describe('canVerifyResult / canCancelRequisition', () => {
  it('only COMPLETED results can be verified', () => {
    expect(canVerifyResult('COMPLETED')).toBe(true);
    expect(canVerifyResult('PENDING')).toBe(false);
    expect(canVerifyResult('VERIFIED')).toBe(false);
  });

  it('PENDING and IN_PROGRESS requisitions can be cancelled', () => {
    expect(canCancelRequisition('PENDING')).toBe(true);
    expect(canCancelRequisition('IN_PROGRESS')).toBe(true);
  });

  it('COMPLETED and VERIFIED requisitions cannot be cancelled', () => {
    expect(canCancelRequisition('COMPLETED')).toBe(false);
    expect(canCancelRequisition('VERIFIED')).toBe(false);
  });
});
