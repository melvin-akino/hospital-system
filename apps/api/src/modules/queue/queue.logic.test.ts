/**
 * Tests for queue management logic (OPD/department queue system).
 * Pure function tests — no DB, no HTTP calls.
 */

// ── Ticket number generation ──────────────────────────────────────────────────

function formatTicketNo(departmentCode: string, count: number): string {
  return `${departmentCode.toUpperCase()}${String(count).padStart(3, '0')}`;
}

// ── Priority logic ────────────────────────────────────────────────────────────

function determineQueuePriority(isSeniorOrPwd: boolean, patientIsSenior: boolean, patientIsPwd: boolean): number {
  return isSeniorOrPwd || patientIsSenior || patientIsPwd ? 1 : 0;
}

// ── Queue entry status transitions ───────────────────────────────────────────

type QueueStatus = 'WAITING' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';

function canCallNext(status: QueueStatus): boolean {
  return status === 'WAITING';
}

function canCompleteService(status: QueueStatus): boolean {
  return status === 'IN_SERVICE';
}

function canMarkNoShow(status: QueueStatus): boolean {
  return status === 'WAITING';
}

// ── Estimated wait time ───────────────────────────────────────────────────────

function estimateWaitMinutes(positionInQueue: number, avgServiceMinutes: number): number {
  return positionInQueue * avgServiceMinutes;
}

// ── Queue sorting (priority then FIFO) ───────────────────────────────────────

interface QueueEntry {
  id: string;
  ticketNo: string;
  priority: number; // 1 = senior/pwd, 0 = regular
  createdAt: Date;
  status: QueueStatus;
}

function sortQueue(entries: QueueEntry[]): QueueEntry[] {
  return [...entries].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority; // higher priority first
    return a.createdAt.getTime() - b.createdAt.getTime(); // FIFO within same priority
  });
}

function getWaitingEntries(entries: QueueEntry[]): QueueEntry[] {
  return entries.filter((e) => e.status === 'WAITING');
}

function getNowServing(entries: QueueEntry[]): QueueEntry | undefined {
  return entries.find((e) => e.status === 'IN_SERVICE');
}

// ── TAT for queue entries ─────────────────────────────────────────────────────

function calculateQueueTat(createdAt: Date, completedAt: Date): number {
  return Math.round((completedAt.getTime() - createdAt.getTime()) / (1000 * 60));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('formatTicketNo', () => {
  it('formats OPD ticket with zero-padded 3-digit count', () => {
    expect(formatTicketNo('OPD', 1)).toBe('OPD001');
    expect(formatTicketNo('OPD', 42)).toBe('OPD042');
    expect(formatTicketNo('OPD', 999)).toBe('OPD999');
  });

  it('uppercases department code', () => {
    expect(formatTicketNo('er', 5)).toBe('ER005');
    expect(formatTicketNo('lab', 12)).toBe('LAB012');
  });

  it('handles 4-digit overflow without truncating', () => {
    expect(formatTicketNo('OPD', 1000)).toBe('OPD1000'); // no truncation
  });
});

describe('determineQueuePriority', () => {
  it('gives priority 1 for senior patients', () => {
    expect(determineQueuePriority(false, true, false)).toBe(1);
  });

  it('gives priority 1 for PWD patients', () => {
    expect(determineQueuePriority(false, false, true)).toBe(1);
  });

  it('gives priority 1 when manually marked senior/pwd at queue entry', () => {
    expect(determineQueuePriority(true, false, false)).toBe(1);
  });

  it('gives priority 0 for regular patients', () => {
    expect(determineQueuePriority(false, false, false)).toBe(0);
  });

  it('gives priority 1 when multiple priority flags are set', () => {
    expect(determineQueuePriority(true, true, true)).toBe(1);
  });
});

describe('queue status transitions', () => {
  it('WAITING entries can be called next', () => {
    expect(canCallNext('WAITING')).toBe(true);
  });

  it('IN_SERVICE entries cannot be called again', () => {
    expect(canCallNext('IN_SERVICE')).toBe(false);
  });

  it('IN_SERVICE entries can be completed', () => {
    expect(canCompleteService('IN_SERVICE')).toBe(true);
  });

  it('WAITING entries cannot be completed directly', () => {
    expect(canCompleteService('WAITING')).toBe(false);
  });

  it('WAITING entries can be marked as no-show', () => {
    expect(canMarkNoShow('WAITING')).toBe(true);
  });

  it('IN_SERVICE entries cannot be marked as no-show', () => {
    expect(canMarkNoShow('IN_SERVICE')).toBe(false);
  });
});

describe('estimateWaitMinutes', () => {
  it('estimates 10 min wait for position 1 with 10-min average service', () => {
    expect(estimateWaitMinutes(1, 10)).toBe(10);
  });

  it('estimates 50 min wait for position 5', () => {
    expect(estimateWaitMinutes(5, 10)).toBe(50);
  });

  it('returns 0 for position 0 (next to be called)', () => {
    expect(estimateWaitMinutes(0, 10)).toBe(0);
  });
});

describe('sortQueue', () => {
  const t1 = new Date('2025-01-01T08:00:00.000Z');
  const t2 = new Date('2025-01-01T08:05:00.000Z');
  const t3 = new Date('2025-01-01T08:10:00.000Z');

  it('places priority-1 (senior/PWD) before priority-0 (regular)', () => {
    const entries: QueueEntry[] = [
      { id: 'e1', ticketNo: 'OPD001', priority: 0, createdAt: t1, status: 'WAITING' },
      { id: 'e2', ticketNo: 'OPD002', priority: 1, createdAt: t2, status: 'WAITING' },
    ];
    const sorted = sortQueue(entries);
    expect(sorted[0].id).toBe('e2'); // senior/PWD first
    expect(sorted[1].id).toBe('e1');
  });

  it('maintains FIFO order within same priority level', () => {
    const entries: QueueEntry[] = [
      { id: 'e3', ticketNo: 'OPD003', priority: 0, createdAt: t3, status: 'WAITING' },
      { id: 'e1', ticketNo: 'OPD001', priority: 0, createdAt: t1, status: 'WAITING' },
      { id: 'e2', ticketNo: 'OPD002', priority: 0, createdAt: t2, status: 'WAITING' },
    ];
    const sorted = sortQueue(entries);
    expect(sorted[0].id).toBe('e1');
    expect(sorted[1].id).toBe('e2');
    expect(sorted[2].id).toBe('e3');
  });

  it('does not mutate the original array', () => {
    const entries: QueueEntry[] = [
      { id: 'e2', ticketNo: 'OPD002', priority: 1, createdAt: t2, status: 'WAITING' },
      { id: 'e1', ticketNo: 'OPD001', priority: 0, createdAt: t1, status: 'WAITING' },
    ];
    const original = [...entries];
    sortQueue(entries);
    expect(entries[0].id).toBe(original[0].id);
  });
});

describe('getWaitingEntries / getNowServing', () => {
  const entries: QueueEntry[] = [
    { id: 'e1', ticketNo: 'OPD001', priority: 0, createdAt: new Date(), status: 'WAITING' },
    { id: 'e2', ticketNo: 'OPD002', priority: 0, createdAt: new Date(), status: 'IN_SERVICE' },
    { id: 'e3', ticketNo: 'OPD003', priority: 0, createdAt: new Date(), status: 'COMPLETED' },
    { id: 'e4', ticketNo: 'OPD004', priority: 0, createdAt: new Date(), status: 'WAITING' },
  ];

  it('returns only WAITING entries', () => {
    const waiting = getWaitingEntries(entries);
    expect(waiting).toHaveLength(2);
    expect(waiting.every((e) => e.status === 'WAITING')).toBe(true);
  });

  it('returns the IN_SERVICE entry as now serving', () => {
    const serving = getNowServing(entries);
    expect(serving?.id).toBe('e2');
  });

  it('returns undefined when no one is being served', () => {
    const noServing = entries.filter((e) => e.status !== 'IN_SERVICE');
    expect(getNowServing(noServing)).toBeUndefined();
  });
});

describe('calculateQueueTat', () => {
  it('calculates TAT in minutes', () => {
    const created = new Date('2025-01-01T08:00:00.000Z');
    const completed = new Date('2025-01-01T08:25:00.000Z');
    expect(calculateQueueTat(created, completed)).toBe(25);
  });

  it('calculates TAT of 0 for instant completion', () => {
    const t = new Date('2025-01-01T08:00:00.000Z');
    expect(calculateQueueTat(t, t)).toBe(0);
  });
});
