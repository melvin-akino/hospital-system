import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

// ============ JSON FILE HELPERS ============
const DATA_DIR = path.join(__dirname, '../../../../data');
const SCANS_FILE = path.join(DATA_DIR, 'barcode-scans.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

interface BarcodeScan {
  id: string;
  barcodeString: string;
  scannedAt: string;
  location?: string;
  scannedBy?: string;
  resolved: boolean;
  type?: string;
  details?: Record<string, unknown>;
}

function readScans(): BarcodeScan[] {
  ensureDataDir();
  if (!fs.existsSync(SCANS_FILE)) {
    fs.writeFileSync(SCANS_FILE, '[]', 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(SCANS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeScans(scans: BarcodeScan[]) {
  ensureDataDir();
  fs.writeFileSync(SCANS_FILE, JSON.stringify(scans, null, 2), 'utf-8');
}

// ============ BARCODE GENERATION ============
// Format: {TYPE}-{REFID}-{timestamp_mod_9999}
function generateBarcodeString(type: string, refId: string): string {
  const checksum = String(Date.now() % 9999).padStart(4, '0');
  return `${type}-${refId}-${checksum}`;
}

// ============ RESOLVE BARCODE ============
async function resolveBarcode(barcodeString: string): Promise<{
  resolved: boolean;
  type?: string;
  details?: Record<string, unknown>;
}> {
  const parts = barcodeString.split('-');
  if (parts.length < 2) return { resolved: false };

  const type = parts[0].toUpperCase();

  if (type === 'PAT') {
    // Extract patient number — format: PAT-PAT-000001-XXXX or PAT-PATNO-XXXX
    // Try to find patient by patientNo embedded in barcode
    const patientNoPart = parts.slice(1, parts.length - 1).join('-');
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { patientNo: { contains: patientNoPart } },
          { patientNo: patientNoPart },
        ],
      },
      include: {
        allergies: { where: { isActive: true }, select: { allergen: true, severity: true } },
      },
    });
    if (patient) {
      return {
        resolved: true,
        type: 'PATIENT',
        details: {
          id: patient.id,
          patientNo: patient.patientNo,
          name: `${patient.lastName}, ${patient.firstName}`,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodType: patient.bloodType,
          allergies: patient.allergies,
          philhealthNo: patient.philhealthNo,
        },
      };
    }
  }

  if (type === 'MED') {
    const itemCodePart = parts.slice(1, parts.length - 1).join('-');
    const item = await prisma.inventoryItem.findFirst({
      where: { itemCode: { contains: itemCodePart } },
      include: { medication: { select: { genericName: true, brandName: true, dosageForm: true, strength: true } } },
    });
    if (item) {
      return {
        resolved: true,
        type: 'MEDICATION',
        details: {
          id: item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          currentStock: item.currentStock,
          unit: item.unit,
          sellingPrice: Number(item.sellingPrice),
          medication: item.medication,
          expiryDate: item.expiryDate,
        },
      };
    }
  }

  if (type === 'ASSET') {
    const assetCodePart = parts.slice(1, parts.length - 1).join('-');
    const asset = await prisma.asset.findFirst({
      where: { assetCode: { contains: assetCodePart } },
    });
    if (asset) {
      return {
        resolved: true,
        type: 'ASSET',
        details: {
          id: asset.id,
          assetCode: asset.assetCode,
          assetName: asset.assetName,
          status: asset.status,
          location: asset.location,
          category: asset.category,
          currentValue: Number(asset.currentValue),
        },
      };
    }
  }

  if (type === 'SPEC') {
    // Specimen — look up lab result
    const resultNoPart = parts.slice(1, parts.length - 1).join('-');
    const result = await prisma.labResult.findFirst({
      where: { resultNo: { contains: resultNoPart } },
      include: { patient: { select: { firstName: true, lastName: true, patientNo: true } } },
    });
    if (result) {
      return {
        resolved: true,
        type: 'SPECIMEN',
        details: {
          id: result.id,
          resultNo: result.resultNo,
          testName: result.testName,
          status: result.status,
          patient: result.patient,
          performedAt: result.performedAt,
        },
      };
    }
  }

  return { resolved: false };
}

// POST /api/barcodes/generate
export const generateBarcode = asyncHandler(async (req: Request, res: Response) => {
  const { type, referenceId } = req.body;

  if (!type || !referenceId) {
    errorResponse(res, 'type and referenceId are required', 400);
    return;
  }

  const validTypes = ['PATIENT', 'MEDICATION', 'SPECIMEN', 'ASSET'];
  if (!validTypes.includes((type as string).toUpperCase())) {
    errorResponse(res, `type must be one of: ${validTypes.join(', ')}`, 400);
    return;
  }

  const typeCode = (type as string).toUpperCase();
  const shortCode = {
    PATIENT: 'PAT',
    MEDICATION: 'MED',
    SPECIMEN: 'SPEC',
    ASSET: 'ASSET',
  }[typeCode] ?? typeCode.slice(0, 4);

  // For PATIENT, get patientNo; for ASSET, get assetCode
  let refLabel = referenceId as string;

  if (typeCode === 'PATIENT') {
    const patient = await prisma.patient.findUnique({ where: { id: referenceId as string } });
    if (!patient) {
      errorResponse(res, 'Patient not found', 404);
      return;
    }
    refLabel = patient.patientNo;
  } else if (typeCode === 'ASSET') {
    const asset = await prisma.asset.findUnique({ where: { id: referenceId as string } });
    if (!asset) {
      errorResponse(res, 'Asset not found', 404);
      return;
    }
    refLabel = asset.assetCode;
  } else if (typeCode === 'MEDICATION') {
    const item = await prisma.inventoryItem.findUnique({ where: { id: referenceId as string } });
    if (!item) {
      errorResponse(res, 'Inventory item not found', 404);
      return;
    }
    refLabel = item.itemCode;
  } else if (typeCode === 'SPECIMEN') {
    const result = await prisma.labResult.findUnique({ where: { id: referenceId as string } });
    if (!result) {
      errorResponse(res, 'Lab result not found', 404);
      return;
    }
    refLabel = result.resultNo;
  }

  const barcodeString = generateBarcodeString(shortCode, refLabel);

  successResponse(res, {
    barcodeString,
    barcodeType: typeCode,
    referenceId,
    refLabel,
    generatedAt: new Date().toISOString(),
  });
});

// POST /api/barcodes/scan
export const scanBarcode = asyncHandler(async (req: Request, res: Response) => {
  const { barcodeString, scannedAt, location, scannedBy } = req.body;

  if (!barcodeString) {
    errorResponse(res, 'barcodeString is required', 400);
    return;
  }

  const resolution = await resolveBarcode(barcodeString as string);

  const scanEntry: BarcodeScan = {
    id: `SCAN-${Date.now()}`,
    barcodeString,
    scannedAt: scannedAt || new Date().toISOString(),
    location: location || undefined,
    scannedBy: scannedBy || undefined,
    resolved: resolution.resolved,
    type: resolution.type,
    details: resolution.details,
  };

  const scans = readScans();
  scans.unshift(scanEntry);
  if (scans.length > 100) scans.splice(100);
  writeScans(scans);

  successResponse(res, {
    scanId: scanEntry.id,
    resolved: resolution.resolved,
    type: resolution.type ?? null,
    details: resolution.details ?? null,
    barcodeString,
    scannedAt: scanEntry.scannedAt,
    location: scanEntry.location ?? null,
  });
});

// GET /api/barcodes/:barcodeString/details
export const getBarcodeDetails = asyncHandler(async (req: Request, res: Response) => {
  const { barcodeString } = req.params;

  const resolution = await resolveBarcode(decodeURIComponent(barcodeString));

  if (!resolution.resolved) {
    errorResponse(res, 'Barcode could not be resolved', 404);
    return;
  }

  successResponse(res, {
    barcodeString: decodeURIComponent(barcodeString),
    ...resolution,
  });
});

// GET /api/barcodes/scan-log
export const getScanLog = asyncHandler(async (_req: Request, res: Response) => {
  const scans = readScans();
  successResponse(res, scans.slice(0, 100));
});

// POST /api/barcodes/patient-wristband/:patientId
export const generateWristband = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.params;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      allergies: {
        where: { isActive: true },
        select: { allergen: true, severity: true, reaction: true },
      },
    },
  });

  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const barcodeString = generateBarcodeString('PAT', patient.patientNo);

  successResponse(res, {
    patientId: patient.id,
    patientNo: patient.patientNo,
    name: `${patient.lastName}, ${patient.firstName}${patient.middleName ? ' ' + patient.middleName : ''}`,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender,
    bloodType: patient.bloodType ?? null,
    allergies: patient.allergies,
    philhealthNo: patient.philhealthNo ?? null,
    barcodeString,
    generatedAt: new Date().toISOString(),
  });
});
