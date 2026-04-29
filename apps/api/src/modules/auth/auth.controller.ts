import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';
import { sendEmail, passwordResetEmail, passwordChangedEmail } from '../../lib/email';

/**
 * Returns an error string if the password fails the complexity policy,
 * or null if it passes.
 *
 * Policy: min 8 chars, at least 1 uppercase letter, 1 digit, 1 special char.
 */
export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8)
    return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password))
    return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password))
    return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password))
    return 'Password must contain at least one special character (e.g. !@#$%).';
  return null;
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: username }],
      isActive: true,
    },
    include: {
      permissions: true,
      department: { select: { id: true, name: true, code: true } },
    },
  });

  if (!user) {
    errorResponse(res, 'Invalid credentials', 401);
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    errorResponse(res, 'Invalid credentials', 401);
    return;
  }

  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn } as jwt.SignOptions);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  successResponse(
    res,
    {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        phone: user.phone,
        departmentId: user.departmentId,
        departmentName: user.department?.name || null,
        departmentCode: user.department?.code || null,
        permissions: user.permissions.map((p) => ({
          module:    p.module,
          canView:   p.canView,
          canCreate: p.canCreate,
          canEdit:   p.canEdit,
          canDelete: p.canDelete,
          canApprove:p.canApprove,
        })),
      },
    },
    'Login successful'
  );
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  successResponse(res, null, 'Logged out successfully');
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
      doctor: {
        select: { id: true, firstName: true, lastName: true, specialty: true },
      },
      permissions: {
        select: { module: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
      },
    },
  });

  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  successResponse(res, user, 'User retrieved');
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existing) {
    errorResponse(res, 'Username or email already exists', 409);
    return;
  }

  const pwErr = validatePasswordStrength(password);
  if (pwErr) {
    errorResponse(res, pwErr, 400);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { username, email, passwordHash, role },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });

  successResponse(res, user, 'User registered successfully', 201);
});

// ── Update own profile ────────────────────────────────────────────────────────
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { email, displayName, phone } = req.body;
  const userId = req.user!.id;

  // Check email uniqueness if changing
  if (email) {
    const conflict = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
    });
    if (conflict) {
      errorResponse(res, 'Email already in use', 409);
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(email && { email }),
      ...(displayName !== undefined && { displayName }),
      ...(phone !== undefined && { phone }),
    },
    select: {
      id: true, username: true, email: true,
      displayName: true, phone: true, role: true,
    },
  });

  successResponse(res, updated, 'Profile updated');
});

// ── Change own password ───────────────────────────────────────────────────────
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.id;

  if (!currentPassword || !newPassword) {
    errorResponse(res, 'currentPassword and newPassword are required', 400);
    return;
  }

  const pwErr = validatePasswordStrength(newPassword);
  if (pwErr) {
    errorResponse(res, pwErr, 400);
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    errorResponse(res, 'Current password is incorrect', 400);
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Invalidate all other sessions
  const currentToken = req.headers.authorization?.split(' ')[1];
  if (currentToken) {
    await prisma.session.deleteMany({
      where: { userId, NOT: { token: currentToken } },
    });
  }

  // Notify user (non-blocking)
  if (user.email) {
    const template = passwordChangedEmail({ name: user.displayName || user.username });
    sendEmail({ ...template, to: user.email }).catch(() => { /* non-fatal */ });
  }

  successResponse(res, null, 'Password changed successfully');
});

// ── Forgot password — generate reset token ────────────────────────────────────
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username) {
    errorResponse(res, 'username or email is required', 400);
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: username }],
      isActive: true,
    },
  });

  // Always return success to prevent username enumeration
  if (!user) {
    successResponse(res, null, 'If an account exists, a reset token has been generated');
    return;
  }

  // Expire existing tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Generate a secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token: rawToken, expiresAt },
  });

  const appUrl = process.env['APP_URL'] || 'http://localhost:5175';
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  // Send email if user has an email address (non-blocking)
  if (user.email) {
    const template = passwordResetEmail({
      name:      user.displayName || user.username,
      resetUrl,
      expiresIn: '1 hour',
    });
    sendEmail({ ...template, to: user.email }).catch(() => { /* non-fatal */ });
  }

  // Also attempt SMS if the user has a phone
  if (user.phone) {
    try {
      const { sendResetSms } = await import('../sms/sms.service');
      await sendResetSms(user.phone, rawToken);
    } catch {
      // Non-fatal
    }
  }

  // In development, return the token directly so it can be used without email/SMS
  const isDev = process.env.NODE_ENV !== 'production';

  successResponse(
    res,
    isDev ? { resetToken: rawToken, expiresAt, resetUrl } : null,
    isDev
      ? 'Reset token generated (dev mode — token returned in response)'
      : 'If an account exists, a reset link has been sent to your email'
  );
});

// ── Reset password with token ─────────────────────────────────────────────────
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    errorResponse(res, 'token and newPassword are required', 400);
    return;
  }

  if (newPassword.length < 8) {
    errorResponse(res, 'Password must be at least 8 characters', 400);
    return;
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    errorResponse(res, 'Invalid or expired reset token', 400);
    return;
  }

  if (record.usedAt) {
    errorResponse(res, 'Reset token has already been used', 400);
    return;
  }

  if (new Date() > record.expiresAt) {
    errorResponse(res, 'Reset token has expired', 400);
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate all sessions
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  // Notify user their password was changed
  if (record.user.email) {
    const template = passwordChangedEmail({
      name: record.user.displayName || record.user.username,
    });
    sendEmail({ ...template, to: record.user.email }).catch(() => { /* non-fatal */ });
  }

  successResponse(res, null, 'Password reset successfully. Please log in with your new password.');
});
