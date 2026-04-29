/**
 * Tests for room housekeeping state transitions and ICU I&O balance calculations.
 * Pure function tests — no DB, no HTTP calls.
 */

// ── Room housekeeping status transitions ──────────────────────────────────────

type HousekeepingStatus = 'CLEAN' | 'DIRTY' | 'IN_PROGRESS' | 'INSPECTED' | 'OUT_OF_SERVICE';
type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';

function getNextHousekeepingStatus(current: HousekeepingStatus): HousekeepingStatus {
  const transitions: Record<HousekeepingStatus, HousekeepingStatus> = {
    DIRTY: 'IN_PROGRESS',
    IN_PROGRESS: 'INSPECTED',
    INSPECTED: 'CLEAN',
    CLEAN: 'DIRTY',             // becomes dirty again when patient is admitted
    OUT_OF_SERVICE: 'OUT_OF_SERVICE',
  };
  return transitions[current];
}

function canAdmitToRoom(housekeepingStatus: HousekeepingStatus, roomStatus: RoomStatus): boolean {
  return housekeepingStatus === 'CLEAN' && roomStatus === 'AVAILABLE';
}

function isRoomReadyForPatient(housekeepingStatus: HousekeepingStatus): boolean {
  return housekeepingStatus === 'CLEAN';
}

function canStartCleaning(housekeepingStatus: HousekeepingStatus): boolean {
  return housekeepingStatus === 'DIRTY';
}

function canInspect(housekeepingStatus: HousekeepingStatus): boolean {
  return housekeepingStatus === 'IN_PROGRESS';
}

// ── ICU Intake & Output balance ───────────────────────────────────────────────

function calculateFluidBalance(intakeML: number, outputML: number): number {
  return intakeML - outputML;
}

function isPositiveBalance(balanceML: number): boolean {
  return balanceML > 0;
}

function isNegativeBalance(balanceML: number): boolean {
  return balanceML < 0;
}

function isCriticalFluidOverload(balanceML: number, threshold = 2000): boolean {
  return balanceML > threshold;
}

function isCriticalFluidDeficit(balanceML: number, threshold = -2000): boolean {
  return balanceML < threshold;
}

interface FluidEntry {
  type: 'INTAKE' | 'OUTPUT';
  amount: number;
  recordedAt: Date;
}

function sumEntries(entries: FluidEntry[], type: 'INTAKE' | 'OUTPUT'): number {
  return entries.filter((e) => e.type === type).reduce((sum, e) => sum + e.amount, 0);
}

function calculateBalanceFromEntries(entries: FluidEntry[]): number {
  const intake = sumEntries(entries, 'INTAKE');
  const output = sumEntries(entries, 'OUTPUT');
  return calculateFluidBalance(intake, output);
}

// ── Vital signs validation ────────────────────────────────────────────────────

interface VitalSigns {
  temperature?: number;  // Celsius
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
}

function hasAbnormalVitals(vitals: VitalSigns): boolean {
  if (vitals.temperature && (vitals.temperature < 35.0 || vitals.temperature > 38.5)) return true;
  if (vitals.bloodPressureSystolic && (vitals.bloodPressureSystolic < 90 || vitals.bloodPressureSystolic > 180)) return true;
  if (vitals.heartRate && (vitals.heartRate < 50 || vitals.heartRate > 120)) return true;
  if (vitals.oxygenSaturation && vitals.oxygenSaturation < 95) return true;
  return false;
}

// ── OB / APGAR score ──────────────────────────────────────────────────────────

interface ApgarComponents {
  appearance: 0 | 1 | 2;     // skin color
  pulse: 0 | 1 | 2;          // heart rate
  grimace: 0 | 1 | 2;        // reflex irritability
  activity: 0 | 1 | 2;       // muscle tone
  respiration: 0 | 1 | 2;    // breathing effort
}

function calculateApgarScore(components: ApgarComponents): number {
  return (
    components.appearance +
    components.pulse +
    components.grimace +
    components.activity +
    components.respiration
  );
}

type ApgarInterpretation = 'NORMAL' | 'MODERATE_CONCERN' | 'REQUIRES_RESUSCITATION';

function interpretApgar(score: number): ApgarInterpretation {
  if (score >= 7) return 'NORMAL';
  if (score >= 4) return 'MODERATE_CONCERN';
  return 'REQUIRES_RESUSCITATION';
}

// ── Gestational age / EDD ─────────────────────────────────────────────────────

function calculateGestationalWeeks(lmpDate: Date, today: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((today.getTime() - lmpDate.getTime()) / msPerWeek);
}

function calculateEdd(lmpDate: Date): Date {
  // Naegele's rule: LMP + 280 days
  return new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
}

function isFullTerm(gestationalWeeks: number): boolean {
  return gestationalWeeks >= 37 && gestationalWeeks <= 42;
}

function isPreterm(gestationalWeeks: number): boolean {
  return gestationalWeeks < 37;
}

function isPostTerm(gestationalWeeks: number): boolean {
  return gestationalWeeks > 42;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('housekeeping status transitions', () => {
  it('DIRTY → IN_PROGRESS when cleaning starts', () => {
    expect(getNextHousekeepingStatus('DIRTY')).toBe('IN_PROGRESS');
  });

  it('IN_PROGRESS → INSPECTED when cleaning finishes', () => {
    expect(getNextHousekeepingStatus('IN_PROGRESS')).toBe('INSPECTED');
  });

  it('INSPECTED → CLEAN when inspection passes', () => {
    expect(getNextHousekeepingStatus('INSPECTED')).toBe('CLEAN');
  });

  it('CLEAN → DIRTY when patient occupies room', () => {
    expect(getNextHousekeepingStatus('CLEAN')).toBe('DIRTY');
  });

  it('OUT_OF_SERVICE stays OUT_OF_SERVICE', () => {
    expect(getNextHousekeepingStatus('OUT_OF_SERVICE')).toBe('OUT_OF_SERVICE');
  });
});

describe('room availability checks', () => {
  it('CLEAN + AVAILABLE room can admit patient', () => {
    expect(canAdmitToRoom('CLEAN', 'AVAILABLE')).toBe(true);
  });

  it('DIRTY room cannot admit patient even if AVAILABLE', () => {
    expect(canAdmitToRoom('DIRTY', 'AVAILABLE')).toBe(false);
  });

  it('CLEAN but OCCUPIED room cannot admit new patient', () => {
    expect(canAdmitToRoom('CLEAN', 'OCCUPIED')).toBe(false);
  });

  it('IN_PROGRESS room is not ready for patient', () => {
    expect(isRoomReadyForPatient('IN_PROGRESS')).toBe(false);
  });

  it('CLEAN room is ready for patient', () => {
    expect(isRoomReadyForPatient('CLEAN')).toBe(true);
  });

  it('can start cleaning DIRTY rooms only', () => {
    expect(canStartCleaning('DIRTY')).toBe(true);
    expect(canStartCleaning('CLEAN')).toBe(false);
  });

  it('can inspect IN_PROGRESS rooms only', () => {
    expect(canInspect('IN_PROGRESS')).toBe(true);
    expect(canInspect('DIRTY')).toBe(false);
  });
});

describe('calculateFluidBalance — ICU I&O', () => {
  it('returns positive balance when intake > output', () => {
    expect(calculateFluidBalance(2500, 1800)).toBe(700);
  });

  it('returns negative balance when output > intake', () => {
    expect(calculateFluidBalance(1500, 2000)).toBe(-500);
  });

  it('returns zero balance when intake equals output', () => {
    expect(calculateFluidBalance(2000, 2000)).toBe(0);
  });
});

describe('fluid balance indicators', () => {
  it('isPositiveBalance returns true for positive balance', () => {
    expect(isPositiveBalance(500)).toBe(true);
    expect(isPositiveBalance(-100)).toBe(false);
    expect(isPositiveBalance(0)).toBe(false);
  });

  it('isNegativeBalance returns true for negative balance', () => {
    expect(isNegativeBalance(-200)).toBe(true);
    expect(isNegativeBalance(100)).toBe(false);
    expect(isNegativeBalance(0)).toBe(false);
  });

  it('isCriticalFluidOverload triggers above 2000mL', () => {
    expect(isCriticalFluidOverload(2001)).toBe(true);
    expect(isCriticalFluidOverload(2000)).toBe(false);
    expect(isCriticalFluidOverload(1500)).toBe(false);
  });

  it('isCriticalFluidDeficit triggers below -2000mL', () => {
    expect(isCriticalFluidDeficit(-2001)).toBe(true);
    expect(isCriticalFluidDeficit(-2000)).toBe(false);
    expect(isCriticalFluidDeficit(-1500)).toBe(false);
  });
});

describe('calculateBalanceFromEntries', () => {
  const entries: FluidEntry[] = [
    { type: 'INTAKE', amount: 500, recordedAt: new Date() },
    { type: 'INTAKE', amount: 250, recordedAt: new Date() },
    { type: 'OUTPUT', amount: 300, recordedAt: new Date() },
    { type: 'OUTPUT', amount: 200, recordedAt: new Date() },
  ];

  it('correctly sums and calculates balance', () => {
    // Intake: 750, Output: 500, Balance: +250
    expect(calculateBalanceFromEntries(entries)).toBe(250);
  });

  it('returns 0 for empty entries', () => {
    expect(calculateBalanceFromEntries([])).toBe(0);
  });

  it('handles all-intake entries (no output)', () => {
    const intakeOnly: FluidEntry[] = [
      { type: 'INTAKE', amount: 1000, recordedAt: new Date() },
    ];
    expect(calculateBalanceFromEntries(intakeOnly)).toBe(1000);
  });
});

describe('hasAbnormalVitals', () => {
  it('detects high temperature (fever)', () => {
    expect(hasAbnormalVitals({ temperature: 39.5 })).toBe(true);
  });

  it('detects low temperature (hypothermia)', () => {
    expect(hasAbnormalVitals({ temperature: 34.8 })).toBe(true);
  });

  it('detects hypertension', () => {
    expect(hasAbnormalVitals({ bloodPressureSystolic: 185 })).toBe(true);
  });

  it('detects hypotension', () => {
    expect(hasAbnormalVitals({ bloodPressureSystolic: 85 })).toBe(true);
  });

  it('detects low oxygen saturation', () => {
    expect(hasAbnormalVitals({ oxygenSaturation: 92 })).toBe(true);
  });

  it('normal vitals return false', () => {
    expect(hasAbnormalVitals({
      temperature: 37.0,
      bloodPressureSystolic: 120,
      heartRate: 75,
      oxygenSaturation: 98,
    })).toBe(false);
  });

  it('returns false for empty vitals object', () => {
    expect(hasAbnormalVitals({})).toBe(false);
  });
});

describe('calculateApgarScore', () => {
  it('calculates perfect 10 score', () => {
    expect(calculateApgarScore({ appearance: 2, pulse: 2, grimace: 2, activity: 2, respiration: 2 })).toBe(10);
  });

  it('calculates score of 0 for severely depressed newborn', () => {
    expect(calculateApgarScore({ appearance: 0, pulse: 0, grimace: 0, activity: 0, respiration: 0 })).toBe(0);
  });

  it('calculates typical normal score of 8', () => {
    expect(calculateApgarScore({ appearance: 1, pulse: 2, grimace: 1, activity: 2, respiration: 2 })).toBe(8);
  });

  it('calculates a score of 6 (moderate concern)', () => {
    expect(calculateApgarScore({ appearance: 1, pulse: 1, grimace: 1, activity: 2, respiration: 1 })).toBe(6);
  });
});

describe('interpretApgar', () => {
  it('7-10 is NORMAL', () => {
    expect(interpretApgar(10)).toBe('NORMAL');
    expect(interpretApgar(7)).toBe('NORMAL');
    expect(interpretApgar(8)).toBe('NORMAL');
  });

  it('4-6 is MODERATE_CONCERN', () => {
    expect(interpretApgar(6)).toBe('MODERATE_CONCERN');
    expect(interpretApgar(4)).toBe('MODERATE_CONCERN');
    expect(interpretApgar(5)).toBe('MODERATE_CONCERN');
  });

  it('0-3 REQUIRES_RESUSCITATION', () => {
    expect(interpretApgar(3)).toBe('REQUIRES_RESUSCITATION');
    expect(interpretApgar(0)).toBe('REQUIRES_RESUSCITATION');
    expect(interpretApgar(1)).toBe('REQUIRES_RESUSCITATION');
  });
});

describe('gestational age calculations', () => {
  const lmp = new Date('2025-01-01T00:00:00.000Z');

  it('calculates gestational weeks from LMP', () => {
    const today = new Date('2025-07-09T00:00:00.000Z'); // 27.1 weeks
    expect(calculateGestationalWeeks(lmp, today)).toBe(27);
  });

  it('calculates EDD as LMP + 280 days', () => {
    const edd = calculateEdd(lmp);
    const diffDays = Math.round((edd.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(280);
  });

  it('isFullTerm at 38 weeks', () => {
    expect(isFullTerm(38)).toBe(true);
    expect(isFullTerm(37)).toBe(true);
    expect(isFullTerm(42)).toBe(true);
  });

  it('isPreterm below 37 weeks', () => {
    expect(isPreterm(36)).toBe(true);
    expect(isPreterm(28)).toBe(true);
    expect(isPreterm(37)).toBe(false);
  });

  it('isPostTerm beyond 42 weeks', () => {
    expect(isPostTerm(43)).toBe(true);
    expect(isPostTerm(42)).toBe(false);
  });
});
