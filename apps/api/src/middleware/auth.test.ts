/**
 * Tests for the auth middleware.
 * The `authenticate` middleware is tested by mocking jwt.verify and prisma.
 */
import jwt from 'jsonwebtoken';

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('jsonwebtoken');
jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import { authenticate, authorize } from './auth';
import { prisma } from '../lib/prisma';

const mockPrismaUser = prisma.user as any;

const makeReqResNext = (authHeader?: string) => {
  const req: any = {
    headers: { authorization: authHeader },
  };
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  const next = jest.fn();
  return { req, res, next };
};

describe('authenticate middleware', () => {
  const SECRET = 'test-secret';

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });

  it('returns 401 when no Authorization header', async () => {
    const { req, res, next } = makeReqResNext(undefined);
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'No token provided' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header has wrong format', async () => {
    const { req, res, next } = makeReqResNext('Token abc123');
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when jwt.verify throws', async () => {
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      throw new Error('invalid signature');
    });
    const { req, res, next } = makeReqResNext('Bearer bad.token.here');
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid or expired token' })
    );
  });

  it('returns 401 when user is not found in DB', async () => {
    (jwt.verify as jest.Mock).mockReturnValueOnce({ userId: 'user-1' });
    mockPrismaUser.findUnique.mockResolvedValueOnce(null);
    const { req, res, next } = makeReqResNext('Bearer valid.token');
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not found or inactive' })
    );
  });

  it('calls next() and sets req.user when token is valid', async () => {
    const mockUser = { id: 'user-1', username: 'admin', email: 'admin@test.com', role: 'ADMIN' };
    (jwt.verify as jest.Mock).mockReturnValueOnce({ userId: 'user-1' });
    mockPrismaUser.findUnique.mockResolvedValueOnce(mockUser);
    const { req, res, next } = makeReqResNext('Bearer valid.token');
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(mockUser);
  });
});

describe('authorize middleware', () => {
  it('returns 401 when req.user is not set', () => {
    const { req, res, next } = makeReqResNext();
    req.user = undefined;
    authorize('ADMIN')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is not in allowed roles', () => {
    const { req, res, next } = makeReqResNext();
    req.user = { id: '1', username: 'nurse', email: '', role: 'NURSE' };
    authorize('ADMIN', 'SUPER_ADMIN')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Insufficient permissions' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user role matches one of the allowed roles', () => {
    const { req, res, next } = makeReqResNext();
    req.user = { id: '1', username: 'admin', email: '', role: 'ADMIN' };
    authorize('ADMIN', 'SUPER_ADMIN')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() for SUPER_ADMIN when only SUPER_ADMIN is allowed', () => {
    const { req, res, next } = makeReqResNext();
    req.user = { id: '1', username: 'superadmin', email: '', role: 'SUPER_ADMIN' };
    authorize('SUPER_ADMIN')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('handles multiple roles correctly — any match passes', () => {
    const roles = ['DOCTOR', 'NURSE', 'ADMIN'];
    for (const role of roles) {
      const { req, res, next } = makeReqResNext();
      req.user = { id: '1', username: 'user', email: '', role };
      authorize(...roles)(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });
});
