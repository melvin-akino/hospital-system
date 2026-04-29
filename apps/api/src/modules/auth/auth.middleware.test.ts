/**
 * Tests for authentication and authorization middleware logic.
 * Pure function tests — no DB, no HTTP calls.
 */

// ── Token header parsing logic (mirrors auth.ts authenticate) ─────────────────

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  return parts[1];
}

// ── JWT payload shape validation ──────────────────────────────────────────────

function isValidJwtPayload(decoded: unknown): decoded is { userId: string } {
  return (
    typeof decoded === 'object' &&
    decoded !== null &&
    'userId' in decoded &&
    typeof (decoded as Record<string, unknown>)['userId'] === 'string'
  );
}

function isValidPortalPayload(decoded: unknown): decoded is { patientId: string; role: string } {
  if (typeof decoded !== 'object' || decoded === null) return false;
  const d = decoded as Record<string, unknown>;
  return typeof d['patientId'] === 'string' && d['role'] === 'PATIENT_PORTAL';
}

// ── RBAC authorize logic (mirrors auth.ts authorize) ─────────────────────────

type Role = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'PHARMACIST' | 'LAB_TECH' | 'CASHIER' | 'MANAGER';

function canAccess(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

function isAuthenticated(user: unknown): boolean {
  return typeof user === 'object' && user !== null && 'id' in user && 'role' in user;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('extractBearerToken', () => {
  it('extracts the token from a valid Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('returns null for missing Authorization header', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it('returns null when header does not start with Bearer', () => {
    expect(extractBearerToken('Basic abc123')).toBeNull();
    expect(extractBearerToken('Token abc123')).toBeNull();
    expect(extractBearerToken('abc123')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractBearerToken('')).toBeNull();
  });

  it('extracts a JWT token correctly', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
    expect(extractBearerToken(`Bearer ${jwt}`)).toBe(jwt);
  });
});

describe('isValidJwtPayload', () => {
  it('returns true for valid staff payload with userId', () => {
    expect(isValidJwtPayload({ userId: 'user-uuid-123' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidJwtPayload(null)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isValidJwtPayload('string')).toBe(false);
    expect(isValidJwtPayload(123)).toBe(false);
  });

  it('returns false when userId is missing', () => {
    expect(isValidJwtPayload({ id: 'user-uuid-123' })).toBe(false);
  });

  it('returns false when userId is not a string', () => {
    expect(isValidJwtPayload({ userId: 42 })).toBe(false);
  });
});

describe('isValidPortalPayload', () => {
  it('returns true for valid patient portal payload', () => {
    expect(isValidPortalPayload({ patientId: 'patient-uuid', role: 'PATIENT_PORTAL' })).toBe(true);
  });

  it('returns false for staff token shape', () => {
    expect(isValidPortalPayload({ userId: 'user-uuid', role: 'DOCTOR' })).toBe(false);
  });

  it('returns false when role is not PATIENT_PORTAL', () => {
    expect(isValidPortalPayload({ patientId: 'p123', role: 'ADMIN' })).toBe(false);
  });

  it('returns false for null or non-object', () => {
    expect(isValidPortalPayload(null)).toBe(false);
    expect(isValidPortalPayload(undefined)).toBe(false);
  });
});

describe('canAccess (RBAC authorize)', () => {
  it('allows access when user role is in the allowed list', () => {
    expect(canAccess('ADMIN', ['ADMIN', 'MANAGER'])).toBe(true);
    expect(canAccess('DOCTOR', ['DOCTOR', 'NURSE'])).toBe(true);
  });

  it('denies access when user role is not in the allowed list', () => {
    expect(canAccess('NURSE', ['ADMIN', 'DOCTOR'])).toBe(false);
    expect(canAccess('CASHIER', ['PHARMACIST', 'LAB_TECH'])).toBe(false);
  });

  it('denies access when allowed list is empty', () => {
    expect(canAccess('ADMIN', [])).toBe(false);
  });

  it('ADMIN can access admin-only endpoints', () => {
    expect(canAccess('ADMIN', ['ADMIN'])).toBe(true);
  });

  it('PHARMACIST cannot access admin-only endpoints', () => {
    expect(canAccess('PHARMACIST', ['ADMIN'])).toBe(false);
  });

  it('multiple roles can share access', () => {
    const allowed: Role[] = ['DOCTOR', 'NURSE', 'ADMIN'];
    expect(canAccess('DOCTOR', allowed)).toBe(true);
    expect(canAccess('NURSE', allowed)).toBe(true);
    expect(canAccess('ADMIN', allowed)).toBe(true);
    expect(canAccess('RECEPTIONIST', allowed)).toBe(false);
  });
});

describe('isAuthenticated', () => {
  it('returns true for a valid user object', () => {
    expect(isAuthenticated({ id: 'u1', username: 'admin', role: 'ADMIN' })).toBe(true);
  });

  it('returns false for undefined (unauthenticated request)', () => {
    expect(isAuthenticated(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAuthenticated(null)).toBe(false);
  });

  it('returns false for an incomplete user object', () => {
    expect(isAuthenticated({ username: 'admin' })).toBe(false);
  });
});
