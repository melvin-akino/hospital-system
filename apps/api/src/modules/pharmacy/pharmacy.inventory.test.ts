/**
 * Tests for pharmacy inventory and batch/lot tracking logic.
 * Pure function tests — no DB, no HTTP calls.
 */

// ── Batch status transitions ───────────────────────────────────────────────────

type BatchStatus = 'ACTIVE' | 'DEPLETED' | 'RECALLED' | 'QUARANTINE';

function determineBatchStatus(quantityRemaining: number, explicitStatus?: BatchStatus): BatchStatus {
  if (explicitStatus && explicitStatus !== 'ACTIVE') return explicitStatus;
  return quantityRemaining <= 0 ? 'DEPLETED' : 'ACTIVE';
}

function canDispenseFromBatch(status: BatchStatus, quantityRemaining: number): boolean {
  return status === 'ACTIVE' && quantityRemaining > 0;
}

// ── Stock level calculations ──────────────────────────────────────────────────

function calculateTotalStock(batches: Array<{ quantityRemaining: number; status: BatchStatus }>): number {
  return batches
    .filter((b) => b.status === 'ACTIVE')
    .reduce((sum, b) => sum + b.quantityRemaining, 0);
}

function isLowStock(currentStock: number, reorderPoint: number): boolean {
  return currentStock <= reorderPoint;
}

function isCriticalStock(currentStock: number, reorderPoint: number): boolean {
  return currentStock <= Math.floor(reorderPoint / 2);
}

// ── Batch allocation (FIFO) ───────────────────────────────────────────────────

interface Batch {
  id: string;
  quantityRemaining: number;
  status: BatchStatus;
  receivedAt: Date;
  expiryDate?: Date;
}

function allocateFifo(
  batches: Batch[],
  quantityNeeded: number
): Array<{ batchId: string; quantityToTake: number }> {
  const sorted = [...batches]
    .filter((b) => canDispenseFromBatch(b.status, b.quantityRemaining))
    .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime()); // oldest first

  const allocations: Array<{ batchId: string; quantityToTake: number }> = [];
  let remaining = quantityNeeded;

  for (const batch of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityRemaining, remaining);
    allocations.push({ batchId: batch.id, quantityToTake: take });
    remaining -= take;
  }

  return allocations;
}

// ── Expiry checks ─────────────────────────────────────────────────────────────

function isExpired(expiryDate: Date, today: Date): boolean {
  return expiryDate < today;
}

function isNearExpiry(expiryDate: Date, today: Date, warningDays = 90): boolean {
  const msWarning = warningDays * 24 * 60 * 60 * 1000;
  return !isExpired(expiryDate, today) && (expiryDate.getTime() - today.getTime()) <= msWarning;
}

function filterActiveBatches(batches: Batch[], today: Date): Batch[] {
  return batches.filter(
    (b) => b.status === 'ACTIVE' && (!b.expiryDate || !isExpired(b.expiryDate, today))
  );
}

// ── Unit price formatting ─────────────────────────────────────────────────────

function formatPhp(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Reorder point logic ───────────────────────────────────────────────────────

function calculateReorderQty(
  maximumStock: number,
  currentStock: number,
  incomingStock: number
): number {
  return Math.max(0, maximumStock - currentStock - incomingStock);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('determineBatchStatus', () => {
  it('returns ACTIVE when stock > 0 and no explicit status', () => {
    expect(determineBatchStatus(100)).toBe('ACTIVE');
  });

  it('returns DEPLETED when quantityRemaining is 0', () => {
    expect(determineBatchStatus(0)).toBe('DEPLETED');
  });

  it('returns RECALLED when explicitly recalled, regardless of stock', () => {
    expect(determineBatchStatus(50, 'RECALLED')).toBe('RECALLED');
  });

  it('returns QUARANTINE when explicitly quarantined', () => {
    expect(determineBatchStatus(100, 'QUARANTINE')).toBe('QUARANTINE');
  });
});

describe('canDispenseFromBatch', () => {
  it('allows dispensing from ACTIVE batch with stock', () => {
    expect(canDispenseFromBatch('ACTIVE', 10)).toBe(true);
  });

  it('blocks dispensing from RECALLED batch', () => {
    expect(canDispenseFromBatch('RECALLED', 100)).toBe(false);
  });

  it('blocks dispensing from QUARANTINE batch', () => {
    expect(canDispenseFromBatch('QUARANTINE', 50)).toBe(false);
  });

  it('blocks dispensing from DEPLETED batch', () => {
    expect(canDispenseFromBatch('DEPLETED', 0)).toBe(false);
  });

  it('blocks dispensing from ACTIVE batch with 0 stock', () => {
    expect(canDispenseFromBatch('ACTIVE', 0)).toBe(false);
  });
});

describe('calculateTotalStock', () => {
  it('sums only ACTIVE batches', () => {
    const batches = [
      { quantityRemaining: 100, status: 'ACTIVE' as BatchStatus },
      { quantityRemaining: 50, status: 'ACTIVE' as BatchStatus },
      { quantityRemaining: 200, status: 'RECALLED' as BatchStatus },
      { quantityRemaining: 30, status: 'DEPLETED' as BatchStatus },
    ];
    expect(calculateTotalStock(batches)).toBe(150);
  });

  it('returns 0 when all batches are non-active', () => {
    const batches = [
      { quantityRemaining: 100, status: 'RECALLED' as BatchStatus },
      { quantityRemaining: 50, status: 'QUARANTINE' as BatchStatus },
    ];
    expect(calculateTotalStock(batches)).toBe(0);
  });

  it('returns 0 for empty batches array', () => {
    expect(calculateTotalStock([])).toBe(0);
  });
});

describe('isLowStock / isCriticalStock', () => {
  it('isLowStock returns true when stock ≤ reorder point', () => {
    expect(isLowStock(10, 10)).toBe(true);
    expect(isLowStock(5, 10)).toBe(true);
  });

  it('isLowStock returns false when stock > reorder point', () => {
    expect(isLowStock(11, 10)).toBe(false);
  });

  it('isCriticalStock returns true when stock ≤ half the reorder point', () => {
    expect(isCriticalStock(5, 10)).toBe(true); // 5 ≤ 5
    expect(isCriticalStock(3, 10)).toBe(true);
  });

  it('isCriticalStock returns false when stock is low but not critical', () => {
    expect(isCriticalStock(8, 10)).toBe(false); // 8 > 5
  });
});

describe('allocateFifo', () => {
  const today = new Date('2025-01-01T00:00:00.000Z');

  const batches: Batch[] = [
    { id: 'b1', quantityRemaining: 20, status: 'ACTIVE', receivedAt: new Date('2024-06-01T00:00:00.000Z') },
    { id: 'b2', quantityRemaining: 30, status: 'ACTIVE', receivedAt: new Date('2024-07-01T00:00:00.000Z') },
    { id: 'b3', quantityRemaining: 50, status: 'ACTIVE', receivedAt: new Date('2024-08-01T00:00:00.000Z') },
  ];

  it('allocates from oldest batch first (FIFO)', () => {
    const result = allocateFifo(batches, 15);
    expect(result[0].batchId).toBe('b1');
    expect(result[0].quantityToTake).toBe(15);
  });

  it('spans multiple batches when quantity exceeds first batch', () => {
    const result = allocateFifo(batches, 25);
    expect(result[0]).toEqual({ batchId: 'b1', quantityToTake: 20 });
    expect(result[1]).toEqual({ batchId: 'b2', quantityToTake: 5 });
  });

  it('allocates across all batches for large quantities', () => {
    const result = allocateFifo(batches, 90);
    const totalAllocated = result.reduce((s, a) => s + a.quantityToTake, 0);
    expect(totalAllocated).toBe(90); // 20 + 30 + 40
  });

  it('skips RECALLED batches', () => {
    const withRecalled: Batch[] = [
      { id: 'bad', quantityRemaining: 100, status: 'RECALLED', receivedAt: new Date('2024-01-01') },
      { id: 'good', quantityRemaining: 50, status: 'ACTIVE', receivedAt: new Date('2024-06-01') },
    ];
    const result = allocateFifo(withRecalled, 10);
    expect(result[0].batchId).toBe('good');
  });

  it('returns empty array when total stock < quantity needed', () => {
    const result = allocateFifo(batches, 200);
    const totalAllocated = result.reduce((s, a) => s + a.quantityToTake, 0);
    expect(totalAllocated).toBe(100); // only 100 total available
  });
});

describe('isExpired / isNearExpiry', () => {
  const today = new Date('2025-06-15T00:00:00.000Z');

  it('isExpired returns true for date before today', () => {
    expect(isExpired(new Date('2025-06-10'), today)).toBe(true);
  });

  it('isExpired returns false for date after today', () => {
    expect(isExpired(new Date('2025-12-31'), today)).toBe(false);
  });

  it('isNearExpiry detects items expiring within 90 days', () => {
    const nearExpiry = new Date('2025-08-01T00:00:00.000Z'); // ~47 days away
    expect(isNearExpiry(nearExpiry, today)).toBe(true);
  });

  it('isNearExpiry returns false for items expiring beyond 90 days', () => {
    const farExpiry = new Date('2026-01-01T00:00:00.000Z'); // ~200 days away
    expect(isNearExpiry(farExpiry, today)).toBe(false);
  });

  it('isNearExpiry returns false for already expired items', () => {
    const expired = new Date('2025-06-10T00:00:00.000Z');
    expect(isNearExpiry(expired, today)).toBe(false);
  });
});

describe('calculateReorderQty', () => {
  it('calculates order quantity to reach max stock', () => {
    expect(calculateReorderQty(500, 100, 50)).toBe(350); // 500 - 100 - 50
  });

  it('returns 0 when current + incoming already meets max', () => {
    expect(calculateReorderQty(500, 300, 250)).toBe(0);
  });

  it('returns 0 when already overstocked', () => {
    expect(calculateReorderQty(500, 600, 0)).toBe(0);
  });
});

describe('formatPhp', () => {
  it('formats whole number correctly', () => {
    expect(formatPhp(1000)).toContain('1,000.00');
  });

  it('includes peso sign', () => {
    expect(formatPhp(500)).toContain('₱');
  });
});
