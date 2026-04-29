/**
 * Tests for billing calculation logic.
 * These test the pure arithmetic used in bill creation, payments, and balance computation.
 */

// ── Billing helper functions (pure, no DB) ────────────────────────────────────
function calculateBillTotal(items: Array<{ quantity: number; unitPrice: number }>): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function calculateBalance(totalAmount: number, paidAmount: number): number {
  return Math.max(0, totalAmount - paidAmount);
}

function calculatePhilHealthDeduction(
  totalAmount: number,
  caseRate: number
): { hospitalShare: number; professionalFee: number; patientResponsibility: number } {
  // PhilHealth case rate split: 70% hospital, 30% professional fee
  const hospitalShare = caseRate * 0.7;
  const professionalFee = caseRate * 0.3;
  const patientResponsibility = Math.max(0, totalAmount - caseRate);
  return { hospitalShare, professionalFee, patientResponsibility };
}

function calculateHmoDeduction(
  totalAmount: number,
  hmoApprovedAmount: number,
  coPayPercent: number
): { hmoPayment: number; patientCoPay: number; totalPayable: number } {
  const hmoPayment = Math.min(hmoApprovedAmount, totalAmount);
  const patientCoPay = totalAmount * (coPayPercent / 100);
  const totalPayable = Math.max(0, totalAmount - hmoPayment + patientCoPay);
  return { hmoPayment, patientCoPay, totalPayable };
}

function getBillStatus(
  totalAmount: number,
  paidAmount: number
): 'PENDING' | 'PARTIAL' | 'PAID' | 'DRAFT' {
  if (paidAmount === 0) return 'PENDING';
  if (paidAmount >= totalAmount) return 'PAID';
  return 'PARTIAL';
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('calculateBillTotal', () => {
  it('sums quantity × unitPrice for all items', () => {
    const items = [
      { quantity: 2, unitPrice: 500 },
      { quantity: 1, unitPrice: 1500 },
      { quantity: 3, unitPrice: 200 },
    ];
    // 1000 + 1500 + 600 = 3100
    expect(calculateBillTotal(items)).toBe(3100);
  });

  it('returns 0 for empty items array', () => {
    expect(calculateBillTotal([])).toBe(0);
  });

  it('handles single item', () => {
    expect(calculateBillTotal([{ quantity: 5, unitPrice: 120 }])).toBe(600);
  });

  it('handles fractional unit prices (decimal)', () => {
    const items = [{ quantity: 3, unitPrice: 33.33 }];
    expect(calculateBillTotal(items)).toBeCloseTo(99.99, 2);
  });
});

describe('calculateBalance', () => {
  it('returns correct unpaid balance', () => {
    expect(calculateBalance(5000, 2000)).toBe(3000);
  });

  it('returns 0 when fully paid', () => {
    expect(calculateBalance(5000, 5000)).toBe(0);
  });

  it('returns 0 when overpaid (clamps to 0)', () => {
    expect(calculateBalance(5000, 6000)).toBe(0);
  });

  it('returns full amount when nothing paid', () => {
    expect(calculateBalance(3500, 0)).toBe(3500);
  });
});

describe('calculatePhilHealthDeduction', () => {
  it('splits case rate 70/30 between hospital and professional fee', () => {
    const result = calculatePhilHealthDeduction(10000, 4000);
    expect(result.hospitalShare).toBe(2800);       // 70% of 4000
    expect(result.professionalFee).toBe(1200);     // 30% of 4000
    expect(result.patientResponsibility).toBe(6000); // 10000 - 4000
  });

  it('patientResponsibility is 0 when case rate covers the full bill', () => {
    const result = calculatePhilHealthDeduction(3000, 5000);
    expect(result.patientResponsibility).toBe(0);
  });

  it('handles zero case rate', () => {
    const result = calculatePhilHealthDeduction(8000, 0);
    expect(result.hospitalShare).toBe(0);
    expect(result.professionalFee).toBe(0);
    expect(result.patientResponsibility).toBe(8000);
  });
});

describe('calculateHmoDeduction', () => {
  it('applies HMO coverage and 10% co-pay', () => {
    const result = calculateHmoDeduction(10000, 8000, 10);
    expect(result.hmoPayment).toBe(8000);
    expect(result.patientCoPay).toBe(1000); // 10% of 10000
    expect(result.totalPayable).toBe(3000); // 10000 - 8000 + 1000
  });

  it('does not apply HMO payment exceeding total bill', () => {
    const result = calculateHmoDeduction(5000, 8000, 0);
    expect(result.hmoPayment).toBe(5000); // capped at total
  });

  it('handles 0% co-pay', () => {
    const result = calculateHmoDeduction(10000, 10000, 0);
    expect(result.patientCoPay).toBe(0);
    expect(result.totalPayable).toBe(0);
  });
});

describe('getBillStatus', () => {
  it('returns PENDING when nothing has been paid', () => {
    expect(getBillStatus(5000, 0)).toBe('PENDING');
  });

  it('returns PAID when fully paid', () => {
    expect(getBillStatus(5000, 5000)).toBe('PAID');
  });

  it('returns PAID when overpaid', () => {
    expect(getBillStatus(5000, 6000)).toBe('PAID');
  });

  it('returns PARTIAL for partial payment', () => {
    expect(getBillStatus(5000, 2500)).toBe('PARTIAL');
  });

  it('returns PARTIAL for payment of 1 peso', () => {
    expect(getBillStatus(5000, 1)).toBe('PARTIAL');
  });
});
