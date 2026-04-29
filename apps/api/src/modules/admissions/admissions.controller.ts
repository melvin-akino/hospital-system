import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { generateAdmissionNo, generateBillNo } from '../../utils/generateNo';

// ── Default consent types created on every admission ─────────────────────────
const DEFAULT_CONSENTS = [
  { consentType: 'GENERAL_TREATMENT',      consentLabel: 'General Consent for Treatment', isRequired: true },
  { consentType: 'FINANCIAL_RESPONSIBILITY',consentLabel: 'Financial Responsibility Agreement', isRequired: true },
  { consentType: 'DATA_PRIVACY',            consentLabel: 'Data Privacy Consent', isRequired: true },
  { consentType: 'BLOOD_TRANSFUSION',       consentLabel: 'Blood Transfusion Consent', isRequired: false },
  { consentType: 'ANESTHESIA',              consentLabel: 'Anesthesia Consent', isRequired: false },
  { consentType: 'SURGERY',                consentLabel: 'Surgical Procedure Consent', isRequired: false },
  { consentType: 'PHOTO_VIDEO',             consentLabel: 'Photo/Video Documentation Consent', isRequired: false },
];

// ── Default document checklist ────────────────────────────────────────────────
const DEFAULT_DOCUMENTS = [
  { documentType: 'VALID_ID',        documentName: 'Valid Government ID (Patient/Guardian)' },
  { documentType: 'HMO_CARD',        documentName: 'HMO Card' },
  { documentType: 'HMO_LOA',         documentName: 'HMO Letter of Authorization (LOA)' },
  { documentType: 'PHILHEALTH_MDR',  documentName: 'PhilHealth Member Data Record (MDR)' },
  { documentType: 'SENIOR_ID',       documentName: 'Senior Citizen ID' },
  { documentType: 'PWD_ID',          documentName: 'PWD ID' },
  { documentType: 'REFERRAL_LETTER', documentName: 'Referral Letter / Doctor\'s Order' },
  { documentType: 'PREV_RECORDS',    documentName: 'Previous Hospital Records' },
];

// ── Shared admission include ──────────────────────────────────────────────────
const admissionInclude = {
  patient: { select: { id: true, patientNo: true, firstName: true, middleName: true, lastName: true, dateOfBirth: true, gender: true, phone: true, address: true, philhealthNo: true, seniorIdNo: true, pwdIdNo: true, isSenior: true, isPwd: true } },
  room: { include: { roomType: true, department: { select: { id: true, name: true } } } },
  department: { select: { id: true, name: true, code: true } },
  hmoRegistration: { include: { hmoCompany: { select: { id: true, name: true, code: true } } } },
  documents: { orderBy: { createdAt: 'asc' as const } },
  consents: { orderBy: { createdAt: 'asc' as const } },
};

// ─────────────────────────────────────────────────────────────────────────────
// ROOMS
// ─────────────────────────────────────────────────────────────────────────────

export const getRooms = asyncHandler(async (req: Request, res: Response) => {
  const { roomTypeId, floor, building, status } = req.query;

  const where: Record<string, unknown> = { isActive: true };
  if (roomTypeId) where['roomTypeId'] = roomTypeId;
  if (floor) where['floor'] = floor;
  if (building) where['building'] = building;
  if (status === 'AVAILABLE') where['isOccupied'] = false;
  if (status === 'OCCUPIED') where['isOccupied'] = true;

  const rooms = await prisma.room.findMany({
    where,
    include: {
      roomType: true,
      department: { select: { id: true, name: true } },
      admissions: {
        where: { status: 'ADMITTED' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
        },
        take: 1,
      },
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  });

  successResponse(res, rooms);
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const { roomNumber, roomTypeId, departmentId, floor, building, beds, notes } = req.body;

  const existing = await prisma.room.findUnique({ where: { roomNumber } });
  if (existing) { errorResponse(res, `Room number ${roomNumber} already exists`, 400); return; }

  const room = await prisma.room.create({
    data: { roomNumber, roomTypeId, departmentId, floor, building, beds: beds || 1, notes },
    include: { roomType: true, department: { select: { id: true, name: true } } },
  });
  successResponse(res, room, 'Room created', 201);
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await prisma.room.findUnique({ where: { id: req.params['id'] } });
  if (!room) { errorResponse(res, 'Room not found', 404); return; }

  const updated = await prisma.room.update({
    where: { id: req.params['id'] },
    data: req.body,
    include: { roomType: true, department: { select: { id: true, name: true } } },
  });
  successResponse(res, updated, 'Room updated');
});

export const updateRoomHousekeeping = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { housekeepingStatus, housekeepingNote } = req.body;
  const cleanedBy = (req as any).user?.displayName || (req as any).user?.username;

  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) { errorResponse(res, 'Room not found', 404); return; }

  const data: any = { housekeepingStatus, housekeepingNote };
  if (housekeepingStatus === 'CLEAN') {
    data.lastCleanedAt = new Date();
    data.lastCleanedBy = cleanedBy;
  }

  const updated = await prisma.room.update({
    where: { id },
    data,
    include: { roomType: true },
  });
  successResponse(res, updated, `Room marked as ${housekeepingStatus}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// ROOM TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const getRoomTypes = asyncHandler(async (_req: Request, res: Response) => {
  const roomTypes = await prisma.roomType.findMany({
    include: { _count: { select: { rooms: true } } },
    orderBy: { name: 'asc' },
  });
  successResponse(res, roomTypes);
});

export const createRoomType = asyncHandler(async (req: Request, res: Response) => {
  const { name, ratePerDay, description } = req.body;
  const existing = await prisma.roomType.findUnique({ where: { name } });
  if (existing) { errorResponse(res, `Room type "${name}" already exists`, 400); return; }
  const roomType = await prisma.roomType.create({ data: { name, ratePerDay, description } });
  successResponse(res, roomType, 'Room type created', 201);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMISSIONS — STATS
// ─────────────────────────────────────────────────────────────────────────────

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalAdmitted, totalRooms, occupiedRooms, avgResult, processing, missingDocs, missingConsents] = await Promise.all([
    prisma.admission.count({ where: { status: 'ADMITTED' } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.room.count({ where: { isOccupied: true, isActive: true } }),
    prisma.admission.findMany({
      where: { status: 'DISCHARGED', dischargedAt: { not: null } },
      select: { admittedAt: true, dischargedAt: true },
      take: 100,
      orderBy: { admittedAt: 'desc' },
    }),
    prisma.admission.count({ where: { status: 'PROCESSING' } }),
    prisma.admissionDocument.count({ where: { isReceived: false, admission: { status: 'ADMITTED' } } }),
    prisma.admissionConsent.count({ where: { isSigned: false, isRequired: true, admission: { status: 'ADMITTED' } } }),
  ]);

  const availableRooms = totalRooms - occupiedRooms;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  let avgLengthOfStay = 0;
  if (avgResult.length > 0) {
    const totalDays = avgResult.reduce((sum, a) => {
      const diff = (new Date(a.dischargedAt!).getTime() - new Date(a.admittedAt).getTime());
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    avgLengthOfStay = parseFloat((totalDays / avgResult.length).toFixed(1));
  }

  successResponse(res, { totalAdmitted, availableRooms, occupancyRate, avgLengthOfStay, totalRooms, processing, pendingDocs: missingDocs, pendingConsents: missingConsents });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMISSIONS — LIST
// ─────────────────────────────────────────────────────────────────────────────

export const getAdmissions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { status, patientId, search } = req.query;

  const where: Record<string, unknown> = {};
  if (status && status !== 'ALL') where['status'] = status;
  if (patientId) where['patientId'] = patientId;

  if (search) {
    where['OR'] = [
      { admissionNo: { contains: search as string, mode: 'insensitive' } },
      { patient: { firstName: { contains: search as string, mode: 'insensitive' } } },
      { patient: { lastName: { contains: search as string, mode: 'insensitive' } } },
      { patient: { patientNo: { contains: search as string, mode: 'insensitive' } } },
    ];
  }

  const [admissions, total] = await Promise.all([
    prisma.admission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { admittedAt: 'desc' },
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true, phone: true } },
        room: { include: { roomType: true } },
        hmoRegistration: { include: { hmoCompany: { select: { id: true, name: true } } } },
        _count: { select: { documents: true, consents: true } },
      },
    }),
    prisma.admission.count({ where }),
  ]);

  const withMeta = admissions.map((a) => {
    const end = a.dischargedAt ? new Date(a.dischargedAt) : new Date();
    const daysStayed = Math.ceil((end.getTime() - new Date(a.admittedAt).getTime()) / (1000 * 60 * 60 * 24));
    return { ...a, daysStayed };
  });

  paginatedResponse(res, withMeta, total, page, limit);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMISSIONS — SINGLE
// ─────────────────────────────────────────────────────────────────────────────

export const getAdmission = asyncHandler(async (req: Request, res: Response) => {
  const admission = await prisma.admission.findUnique({
    where: { id: req.params['id'] },
    include: admissionInclude,
  });

  if (!admission) { errorResponse(res, 'Admission not found', 404); return; }

  const end = admission.dischargedAt ? new Date(admission.dischargedAt) : new Date();
  const daysStayed = Math.ceil((end.getTime() - new Date(admission.admittedAt).getTime()) / (1000 * 60 * 60 * 24));

  successResponse(res, { ...admission, daysStayed });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMISSIONS — CREATE (full intake)
// ─────────────────────────────────────────────────────────────────────────────

export const createAdmission = asyncHandler(async (req: Request, res: Response) => {
  const {
    patientId, roomId, attendingDoctor, diagnosis, notes,
    admissionType, admissionSource, serviceClass,
    chiefComplaint, triageLevel, departmentId,
    // Guarantor
    guarantorName, guarantorRelationship, guarantorContact, guarantorAddress,
    // HMO
    hmoRegistrationId, hmoName, hmoCardNumber, hmoLOANumber, hmoApprovedAmount,
    // PhilHealth
    philhealthNumber, philhealthMemberType,
    // Senior/PWD
    seniorPWDId, discountType,
    // Deposit
    initialDeposit, depositMethod, depositReceivedBy,
    // Status
    status,
    // Document/consent flags
    createDefaultDocuments = true,
    createDefaultConsents = true,
  } = req.body;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) { errorResponse(res, 'Patient not found', 404); return; }

  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) { errorResponse(res, 'Room not found', 404); return; }
    if (room.isOccupied) { errorResponse(res, `Room ${room.roomNumber} is already occupied`, 400); return; }
  }

  const existing = await prisma.admission.findFirst({ where: { patientId, status: { in: ['ADMITTED', 'PROCESSING'] } } });
  if (existing) { errorResponse(res, 'Patient is already admitted or being processed', 400); return; }

  const admissionNo = await generateAdmissionNo();
  const admittedById = (req as any).user?.id;
  const finalStatus = status || 'ADMITTED';

  const admission = await prisma.$transaction(async (tx) => {
    const created = await tx.admission.create({
      data: {
        admissionNo,
        patientId,
        roomId,
        attendingDoctor,
        diagnosis,
        notes,
        chiefComplaint,
        triageLevel: triageLevel ? Number(triageLevel) : undefined,
        admissionType: admissionType || 'INPATIENT',
        admissionSource,
        serviceClass,
        departmentId,
        status: finalStatus,
        // Guarantor
        guarantorName, guarantorRelationship, guarantorContact, guarantorAddress,
        // HMO
        hmoRegistrationId, hmoName, hmoCardNumber, hmoLOANumber,
        hmoApprovedAmount: hmoApprovedAmount ? Number(hmoApprovedAmount) : undefined,
        // PhilHealth
        philhealthNumber: philhealthNumber || patient.philhealthNo,
        philhealthMemberType,
        // Senior/PWD
        seniorPWDId: seniorPWDId || patient.seniorIdNo || patient.pwdIdNo,
        discountType,
        // Deposit
        initialDeposit: initialDeposit ? Number(initialDeposit) : undefined,
        depositMethod, depositReceivedBy,
        admittedById,
      },
      include: admissionInclude,
    });

    if (roomId && finalStatus === 'ADMITTED') {
      await tx.room.update({ where: { id: roomId }, data: { isOccupied: true } });
    }

    // ── Auto-create DRAFT bill linked to this admission ───────────────────
    if (finalStatus === 'ADMITTED') {
      const billNo = await generateBillNo();
      // Determine Senior/PWD discount
      let discountPercent = 0;
      let discountType: string | undefined = undefined;
      if (!req.body.discountType || req.body.discountType === 'NONE') {
        if (patient.isSenior) { discountPercent = 20; discountType = 'SENIOR'; }
        else if (patient.isPwd) { discountPercent = 20; discountType = 'PWD'; }
      } else {
        discountType = req.body.discountType;
        discountPercent = req.body.discountPercent || (discountType !== 'NONE' ? 20 : 0);
      }

      const bill = await tx.bill.create({
        data: {
          billNo,
          patientId,
          admissionId: created.id,
          status: 'DRAFT',
          subtotal: 0,
          discountType: discountType || null,
          discountPercent,
          discountAmount: 0,
          totalAmount: 0,
          paidAmount: 0,
          balance: 0,
          notes: `Auto-created on admission ${admissionNo}`,
        },
      });

      // If initial deposit was collected, record it as a payment
      if (initialDeposit && Number(initialDeposit) > 0) {
        await tx.payment.create({
          data: {
            billId: bill.id,
            amount: Number(initialDeposit),
            method: (depositMethod as any) || 'CASH',
            receivedBy: depositReceivedBy || admittedById || undefined,
            notes: 'Initial deposit on admission',
          },
        });
        // Update paidAmount and balance on the bill
        await tx.bill.update({
          where: { id: bill.id },
          data: { paidAmount: Number(initialDeposit), balance: -Number(initialDeposit) },
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    // Create default document checklist
    if (createDefaultDocuments) {
      const docsToCreate = DEFAULT_DOCUMENTS.filter((d) => {
        if (d.documentType === 'HMO_CARD' || d.documentType === 'HMO_LOA') return !!hmoRegistrationId;
        if (d.documentType === 'PHILHEALTH_MDR') return !!(philhealthNumber || patient.philhealthNo);
        if (d.documentType === 'SENIOR_ID') return patient.isSenior || discountType === 'SENIOR';
        if (d.documentType === 'PWD_ID') return patient.isPwd || discountType === 'PWD';
        return true;
      });
      await tx.admissionDocument.createMany({
        data: docsToCreate.map((d) => ({ admissionId: created.id, ...d })),
      });
    }

    // Create default consent checklist
    if (createDefaultConsents) {
      await tx.admissionConsent.createMany({
        data: DEFAULT_CONSENTS.map((c) => ({ admissionId: created.id, ...c })),
      });
    }

    return created;
  });

  // Re-fetch with documents and consents
  const full = await prisma.admission.findUnique({ where: { id: admission.id }, include: admissionInclude });
  successResponse(res, full, 'Patient admitted successfully', 201);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMISSIONS — UPDATE (partial update of any field)
// ─────────────────────────────────────────────────────────────────────────────

export const updateAdmission = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.admission.findUnique({ where: { id: req.params['id'] } });
  if (!existing) { errorResponse(res, 'Admission not found', 404); return; }

  const {
    roomId, attendingDoctor, diagnosis, notes, chiefComplaint,
    admissionType, admissionSource, serviceClass, status,
    guarantorName, guarantorRelationship, guarantorContact, guarantorAddress,
    hmoRegistrationId, hmoName, hmoCardNumber, hmoLOANumber, hmoApprovedAmount,
    philhealthNumber, philhealthMemberType,
    seniorPWDId, discountType,
    initialDeposit, depositMethod, depositReceivedBy,
    dischargeSummary, dischargeType, dischargedAt,
  } = req.body;

  // Handle room change
  if (roomId && roomId !== existing.roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) { errorResponse(res, 'Room not found', 404); return; }
    if (room.isOccupied) { errorResponse(res, `Room ${room.roomNumber} is already occupied`, 400); return; }
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Free old room if room is changing
    if (roomId !== undefined && roomId !== existing.roomId && existing.roomId) {
      await tx.room.update({ where: { id: existing.roomId }, data: { isOccupied: false } });
    }
    // Occupy new room
    if (roomId && roomId !== existing.roomId) {
      await tx.room.update({ where: { id: roomId }, data: { isOccupied: true } });
    }

    return tx.admission.update({
      where: { id: req.params['id'] },
      data: {
        ...(roomId !== undefined && { roomId }),
        ...(attendingDoctor !== undefined && { attendingDoctor }),
        ...(diagnosis !== undefined && { diagnosis }),
        ...(notes !== undefined && { notes }),
        ...(chiefComplaint !== undefined && { chiefComplaint }),
        ...(admissionType !== undefined && { admissionType }),
        ...(admissionSource !== undefined && { admissionSource }),
        ...(serviceClass !== undefined && { serviceClass }),
        ...(status !== undefined && { status }),
        ...(guarantorName !== undefined && { guarantorName }),
        ...(guarantorRelationship !== undefined && { guarantorRelationship }),
        ...(guarantorContact !== undefined && { guarantorContact }),
        ...(guarantorAddress !== undefined && { guarantorAddress }),
        ...(hmoRegistrationId !== undefined && { hmoRegistrationId }),
        ...(hmoName !== undefined && { hmoName }),
        ...(hmoCardNumber !== undefined && { hmoCardNumber }),
        ...(hmoLOANumber !== undefined && { hmoLOANumber }),
        ...(hmoApprovedAmount !== undefined && { hmoApprovedAmount: Number(hmoApprovedAmount) }),
        ...(philhealthNumber !== undefined && { philhealthNumber }),
        ...(philhealthMemberType !== undefined && { philhealthMemberType }),
        ...(seniorPWDId !== undefined && { seniorPWDId }),
        ...(discountType !== undefined && { discountType }),
        ...(initialDeposit !== undefined && { initialDeposit: Number(initialDeposit) }),
        ...(depositMethod !== undefined && { depositMethod }),
        ...(depositReceivedBy !== undefined && { depositReceivedBy }),
        ...(dischargeSummary !== undefined && { dischargeSummary }),
        ...(dischargeType !== undefined && { dischargeType }),
        ...(dischargedAt !== undefined && { dischargedAt: new Date(dischargedAt) }),
      },
      include: admissionInclude,
    });
  });

  successResponse(res, updated, 'Admission updated');
});

// ─────────────────────────────────────────────────────────────────────────────
// DISCHARGE
// ─────────────────────────────────────────────────────────────────────────────

export const dischargePatient = asyncHandler(async (req: Request, res: Response) => {
  const { dischargeNotes, dischargedAt, dischargeSummary, dischargeType, diagnosis } = req.body;

  const admission = await prisma.admission.findUnique({
    where: { id: req.params['id'] },
    include: { room: { include: { roomType: true } } },
  });
  if (!admission) { errorResponse(res, 'Admission not found', 404); return; }
  if (admission.status === 'DISCHARGED') { errorResponse(res, 'Patient is already discharged', 400); return; }

  const dischargeDate = dischargedAt ? new Date(dischargedAt) : new Date();

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update the admission record
    const discharged = await tx.admission.update({
      where: { id: req.params['id'] },
      data: {
        status: 'DISCHARGED',
        dischargedAt: dischargeDate,
        ...(diagnosis && { diagnosis }),
        ...(dischargeSummary && { dischargeSummary }),
        ...(dischargeType && { dischargeType }),
        ...(dischargeNotes && {
          notes: `${admission.notes || ''}\nDischarge notes: ${dischargeNotes}`.trim(),
        }),
      },
      include: admissionInclude,
    });

    // 2. Free the room
    if (admission.roomId) {
      await tx.room.update({ where: { id: admission.roomId }, data: { isOccupied: false } });
    }

    // 3. Find the linked bill
    const bill = await tx.bill.findFirst({ where: { admissionId: admission.id } });

    if (bill) {
      const billUpdates: Record<string, unknown> = { status: 'FINALIZED', finalizedAt: new Date() };
      const newItems: { billId: string; description: string; quantity: number; unitPrice: number; discount: number; total: number; departmentName: string }[] = [];

      // 4. Post room accommodation charge if room has a daily rate
      const roomRate = Number((admission.room as any)?.roomType?.ratePerDay || 0);
      if (roomRate > 0 && admission.roomId) {
        const admitMs = new Date(admission.admittedAt).getTime();
        const dischargeMs = dischargeDate.getTime();
        const days = Math.max(1, Math.ceil((dischargeMs - admitMs) / (1000 * 60 * 60 * 24)));
        const roomTypeName = (admission.room as any)?.roomType?.name || 'Room';

        // Check if room charge already posted to avoid double-posting
        const existing = await tx.billItem.findFirst({
          where: { billId: bill.id, description: { startsWith: 'Room Accommodation' } },
        });

        if (!existing) {
          newItems.push({
            billId: bill.id,
            description: `Room Accommodation — ${roomTypeName} (${days} day${days !== 1 ? 's' : ''})`,
            quantity: days,
            unitPrice: roomRate,
            discount: 0,
            total: days * roomRate,
            departmentName: 'Nursing',
          });
        }
      }

      // 5. Create new bill items
      if (newItems.length > 0) {
        await tx.billItem.createMany({ data: newItems });
      }

      // 6. Recalculate bill totals
      const allItems = await tx.billItem.findMany({ where: { billId: bill.id } });
      const subtotal = allItems.reduce((s, i) => s + Number(i.unitPrice) * i.quantity - Number(i.discount), 0);
      const discountAmount = (subtotal * Number(bill.discountPercent)) / 100;
      const netAfterDiscount = subtotal - discountAmount - Number(bill.philhealthDeduction) - Number(bill.hmoDeduction);
      const totalAmount = Math.max(0, netAfterDiscount);
      const balance = Math.max(0, totalAmount - Number(bill.paidAmount));

      billUpdates['subtotal'] = subtotal;
      billUpdates['discountAmount'] = discountAmount;
      billUpdates['totalAmount'] = totalAmount;
      billUpdates['balance'] = balance;

      await tx.bill.update({ where: { id: bill.id }, data: billUpdates });
    }

    return discharged;
  });

  successResponse(res, updated, 'Patient discharged successfully');
});

// ─────────────────────────────────────────────────────────────────────────────
// BILLING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /admissions/:id/discharge-summary
 * Returns a comprehensive discharge package: admission details, stay duration,
 * final diagnosis, discharge notes, medications, lab results, clinical notes,
 * and bill summary.
 */
export const getDischargeSummary = asyncHandler(async (req: Request, res: Response) => {
  const admission = await prisma.admission.findUnique({
    where: { id: req.params['id'] },
    include: {
      patient: true,
      room: { include: { roomType: true } },
      department: { select: { name: true } },
    },
  });
  if (!admission) { errorResponse(res, 'Admission not found', 404); return; }

  // Parallel fetch: bill, clinical notes, lab results, prescriptions
  const [bill, clinicalNotes, labResults, prescriptions] = await Promise.all([
    prisma.bill.findFirst({
      where: { admissionId: admission.id },
      include: { items: true, payments: true },
    }),
    prisma.clinicalNote.findMany({
      where: { admissionId: admission.id },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { displayName: true, role: true } } },
    }),
    prisma.labResult.findMany({
      where: { patientId: admission.patientId, createdAt: { gte: admission.admittedAt } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.prescription.findMany({
      where: { admissionId: admission.id },
      include: { items: true },
      orderBy: { prescribedAt: 'desc' },
    }),
  ]);

  const admitDate    = new Date(admission.admittedAt);
  const dischargeDate = admission.dischargedAt ? new Date(admission.dischargedAt) : new Date();
  const stayDays     = Math.max(1, Math.ceil((dischargeDate.getTime() - admitDate.getTime()) / (1000 * 60 * 60 * 24)));

  successResponse(res, {
    admission,
    stayDays,
    bill,
    clinicalNotes,
    labResults,
    prescriptions,
  });
});

/** GET /admissions/:id/bill — return the bill linked to this admission */
export const getAdmissionBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await prisma.bill.findFirst({
    where: { admissionId: req.params['id'] },
    include: {
      items: { orderBy: { id: 'asc' } },
      payments: { orderBy: { paidAt: 'asc' } },
      patient: { select: { firstName: true, lastName: true, patientNo: true } },
    },
  });

  if (!bill) { errorResponse(res, 'No bill found for this admission', 404); return; }
  successResponse(res, bill);
});

/** POST /admissions/:id/post-room-charges — post room charges for days so far (idempotent) */
export const postRoomCharges = asyncHandler(async (req: Request, res: Response) => {
  const admission = await prisma.admission.findUnique({
    where: { id: req.params['id'] },
    include: { room: { include: { roomType: true } } },
  });
  if (!admission) { errorResponse(res, 'Admission not found', 404); return; }
  if (admission.status === 'DISCHARGED') { errorResponse(res, 'Admission is already discharged', 400); return; }

  const bill = await prisma.bill.findFirst({ where: { admissionId: admission.id } });
  if (!bill) { errorResponse(res, 'No bill linked to this admission', 404); return; }

  const roomRate = Number((admission.room as any)?.roomType?.ratePerDay || 0);
  if (roomRate === 0) { errorResponse(res, 'Room has no daily rate configured', 400); return; }

  const admitMs = new Date(admission.admittedAt).getTime();
  const nowMs = Date.now();
  const days = Math.max(1, Math.ceil((nowMs - admitMs) / (1000 * 60 * 60 * 24)));
  const roomTypeName = (admission.room as any)?.roomType?.name || 'Room';

  // Remove any existing room charge and replace (idempotent)
  await prisma.billItem.deleteMany({
    where: { billId: bill.id, description: { startsWith: 'Room Accommodation' } },
  });

  await prisma.billItem.create({
    data: {
      billId: bill.id,
      description: `Room Accommodation — ${roomTypeName} (${days} day${days !== 1 ? 's' : ''})`,
      quantity: days,
      unitPrice: roomRate,
      discount: 0,
      total: days * roomRate,
      departmentName: 'Nursing',
    },
  });

  // Recalculate totals
  const allItems = await prisma.billItem.findMany({ where: { billId: bill.id } });
  const subtotal = allItems.reduce((s, i) => s + Number(i.unitPrice) * i.quantity - Number(i.discount), 0);
  const discountAmount = (subtotal * Number(bill.discountPercent)) / 100;
  const totalAmount = Math.max(0, subtotal - discountAmount - Number(bill.philhealthDeduction) - Number(bill.hmoDeduction));
  const balance = Math.max(0, totalAmount - Number(bill.paidAmount));

  const updated = await prisma.bill.update({
    where: { id: bill.id },
    data: { subtotal, discountAmount, totalAmount, balance },
    include: { items: true },
  });

  successResponse(res, updated, `Room charges posted: ${days} day(s) × ₱${roomRate.toLocaleString()} = ₱${(days * roomRate).toLocaleString()}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const getDocuments = asyncHandler(async (req: Request, res: Response) => {
  const docs = await prisma.admissionDocument.findMany({
    where: { admissionId: req.params['id'] },
    orderBy: { createdAt: 'asc' },
  });
  successResponse(res, docs);
});

export const upsertDocument = asyncHandler(async (req: Request, res: Response) => {
  const { documentType, documentName, notes, isReceived, receivedBy } = req.body;
  const { id: admissionId, docId } = req.params;

  if (docId) {
    const updated = await prisma.admissionDocument.update({
      where: { id: docId },
      data: {
        ...(documentName !== undefined && { documentName }),
        ...(notes !== undefined && { notes }),
        ...(isReceived !== undefined && { isReceived, receivedAt: isReceived ? new Date() : null }),
        ...(receivedBy !== undefined && { receivedBy }),
      },
    });
    successResponse(res, updated, 'Document updated');
  } else {
    const doc = await prisma.admissionDocument.create({
      data: { admissionId, documentType, documentName, notes, isReceived: isReceived || false,
        receivedAt: isReceived ? new Date() : null, receivedBy },
    });
    successResponse(res, doc, 'Document added', 201);
  }
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  await prisma.admissionDocument.delete({ where: { id: req.params['docId'] } });
  successResponse(res, null, 'Document removed');
});

// ─────────────────────────────────────────────────────────────────────────────
// CONSENTS
// ─────────────────────────────────────────────────────────────────────────────

export const getConsents = asyncHandler(async (req: Request, res: Response) => {
  const consents = await prisma.admissionConsent.findMany({
    where: { admissionId: req.params['id'] },
    orderBy: { createdAt: 'asc' },
  });
  successResponse(res, consents);
});

export const signConsent = asyncHandler(async (req: Request, res: Response) => {
  const { consentId } = req.params;
  const { signedByName, signerRelationship, witnessName, notes } = req.body;

  const updated = await prisma.admissionConsent.update({
    where: { id: consentId },
    data: {
      isSigned: true,
      signedByName,
      signerRelationship,
      witnessName,
      notes,
      signedAt: new Date(),
    },
  });
  successResponse(res, updated, 'Consent signed');
});

export const unsignConsent = asyncHandler(async (req: Request, res: Response) => {
  const updated = await prisma.admissionConsent.update({
    where: { id: req.params['consentId'] },
    data: { isSigned: false, signedByName: null, signedAt: null, witnessName: null },
  });
  successResponse(res, updated, 'Consent unsigned');
});

export const addConsent = asyncHandler(async (req: Request, res: Response) => {
  const { consentType, consentLabel, isRequired } = req.body;
  const consent = await prisma.admissionConsent.create({
    data: { admissionId: req.params['id'], consentType, consentLabel, isRequired: isRequired ?? false },
  });
  successResponse(res, consent, 'Consent added', 201);
});

// ══════════════════════════════════════════════════════════════════════════════
// ICU Record — drips / I&O / ventilator / RASS / code status
// ══════════════════════════════════════════════════════════════════════════════

export const getIcuRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const record = await (prisma as any).icuAdmissionRecord.findUnique({
    where: { admissionId: id },
  });
  // Return empty defaults if not yet created
  successResponse(res, record || {
    admissionId: id,
    codeStatus: 'FULL_CODE',
    rassScore: null,
    dripOrders: [],
    ioRecords: [],
    ventSettings: null,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Obstetric Record — partograph / FHR monitoring / OB data
// ══════════════════════════════════════════════════════════════════════════════

export const getObsRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const record = await (prisma as any).obstetricRecord.findUnique({
    where: { admissionId: id },
  });
  successResponse(res, record || {
    admissionId: id,
    partographData: [],
    fhrRecords: [],
  });
});

export const upsertObsRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const {
    gravida, para, abortus, lastMenstrualPeriod, estimatedDeliveryDate,
    gestationalAgeAtAdmit, presentationType, membraneStatus, membraneRupturedAt,
    bloodGroup, partographData, fhrRecords,
  } = req.body;
  const updatedBy = (req as any).user?.displayName || (req as any).user?.username;

  const data: any = { updatedBy };
  if (gravida !== undefined) data.gravida = gravida;
  if (para !== undefined) data.para = para;
  if (abortus !== undefined) data.abortus = abortus;
  if (lastMenstrualPeriod) data.lastMenstrualPeriod = new Date(lastMenstrualPeriod);
  if (estimatedDeliveryDate) data.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
  if (gestationalAgeAtAdmit !== undefined) data.gestationalAgeAtAdmit = gestationalAgeAtAdmit;
  if (presentationType !== undefined) data.presentationType = presentationType;
  if (membraneStatus !== undefined) data.membraneStatus = membraneStatus;
  if (membraneRupturedAt) data.membraneRupturedAt = new Date(membraneRupturedAt);
  if (bloodGroup !== undefined) data.bloodGroup = bloodGroup;
  if (partographData !== undefined) data.partographData = partographData;
  if (fhrRecords !== undefined) data.fhrRecords = fhrRecords;

  const record = await (prisma as any).obstetricRecord.upsert({
    where: { admissionId: id },
    create: { admissionId: id, ...data, partographData: partographData || [], fhrRecords: fhrRecords || [] },
    update: data,
  });
  successResponse(res, record, 'Obstetric record updated');
});

export const upsertIcuRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { codeStatus, rassScore, dripOrders, ioRecords, ventSettings } = req.body;
  const updatedBy = (req as any).user?.displayName || (req as any).user?.username;

  const record = await (prisma as any).icuAdmissionRecord.upsert({
    where: { admissionId: id },
    create: {
      admissionId: id,
      codeStatus: codeStatus || 'FULL_CODE',
      rassScore: rassScore ?? null,
      dripOrders: dripOrders || [],
      ioRecords: ioRecords || [],
      ventSettings: ventSettings || null,
      updatedBy,
    },
    update: {
      ...(codeStatus !== undefined && { codeStatus }),
      ...(rassScore !== undefined && { rassScore }),
      ...(dripOrders !== undefined && { dripOrders }),
      ...(ioRecords !== undefined && { ioRecords }),
      ...(ventSettings !== undefined && { ventSettings }),
      updatedBy,
    },
  });
  successResponse(res, record, 'ICU record updated');
});
