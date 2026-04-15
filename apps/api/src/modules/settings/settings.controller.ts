import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

// ── Default branding values ───────────────────────────────────────────────────
export const BRANDING_DEFAULTS: Record<string, string> = {
  system_name:      'iHIMS',
  system_subtitle:  'intelligent Hospital Information System',
  logo_url:         '',
  primary_color:    '#1890ff',
  sidebar_color:    '#001529',
  hospital_name:    'iHIMS General Hospital',
  hospital_address: '',
  hospital_phone:   '',
  hospital_email:   '',
  hospital_license: '',
  senior_discount:  '20',
  pwd_discount:     '20',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getConfig(): Promise<Record<string, string>> {
  const rows = await prisma.systemConfig.findMany();
  const map: Record<string, string> = { ...BRANDING_DEFAULTS };
  rows.forEach((r) => {
    map[r.key] = r.value;
  });
  return map;
}

async function setConfig(key: string, value: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// ── Multer logo upload ────────────────────────────────────────────────────────
const logoDir = path.join(__dirname, '../../../uploads/logos');
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, SVG, and WebP images are allowed'));
    }
  },
});

export const logoUploadMiddleware = upload.single('logo');

// ── Public branding (no auth — needed for login page) ─────────────────────────
export const getPublicBranding = asyncHandler(async (_req: Request, res: Response) => {
  const config = await getConfig();
  successResponse(res, {
    systemName:     config.system_name,
    systemSubtitle: config.system_subtitle,
    logoUrl:        config.logo_url || null,
    primaryColor:   config.primary_color,
    sidebarColor:   config.sidebar_color,
  });
});

// ── All settings (admin) ──────────────────────────────────────────────────────
export const getAllSettings = asyncHandler(async (_req: Request, res: Response) => {
  const config = await getConfig();
  successResponse(res, config);
});

// ── Update settings ───────────────────────────────────────────────────────────
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  const allowed = new Set(Object.keys(BRANDING_DEFAULTS));

  for (const [key, value] of Object.entries(updates)) {
    if (!allowed.has(key)) continue; // ignore unknown keys
    await setConfig(key, String(value));
  }

  const config = await getConfig();
  successResponse(res, config, 'Settings updated');
});

// ── Upload logo ───────────────────────────────────────────────────────────────
export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    errorResponse(res, 'No file uploaded', 400);
    return;
  }

  // Delete previous logo file if it exists
  const existing = await prisma.systemConfig.findUnique({ where: { key: 'logo_url' } });
  if (existing?.value) {
    const oldFile = path.join(__dirname, '../../../uploads/logos', path.basename(existing.value));
    if (fs.existsSync(oldFile)) {
      try { fs.unlinkSync(oldFile); } catch { /* ignore */ }
    }
  }

  const logoUrl = `/uploads/logos/${req.file.filename}`;
  await setConfig('logo_url', logoUrl);

  successResponse(res, { logoUrl }, 'Logo uploaded successfully');
});

// ── Delete logo ───────────────────────────────────────────────────────────────
export const deleteLogo = asyncHandler(async (_req: Request, res: Response) => {
  const existing = await prisma.systemConfig.findUnique({ where: { key: 'logo_url' } });
  if (existing?.value) {
    const file = path.join(__dirname, '../../../uploads/logos', path.basename(existing.value));
    if (fs.existsSync(file)) {
      try { fs.unlinkSync(file); } catch { /* ignore */ }
    }
    await setConfig('logo_url', '');
  }
  successResponse(res, null, 'Logo removed');
});
