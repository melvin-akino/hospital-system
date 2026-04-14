import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse } from '../../utils/response';

// GET /api/analytics/dashboard
export const getDashboardKPIs = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    todayRevenueAgg,
    monthRevenueAgg,
    yearRevenueAgg,
    todayPatients,
    monthPatients,
    totalPatients,
    todayConsultations,
    monthConsultations,
    pendingBills,
    pendingLabResults,
    pendingPhilHealthClaims,
    admittedPatients,
    totalRooms,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { paidAt: { gte: todayStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { paidAt: { gte: yearStart } },
      _sum: { amount: true },
    }),
    prisma.patient.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.patient.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.patient.count(),
    prisma.consultation.count({
      where: { scheduledAt: { gte: todayStart }, status: { not: 'CANCELLED' } },
    }),
    prisma.consultation.count({
      where: { scheduledAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
    }),
    prisma.bill.count({ where: { status: { in: ['FINALIZED', 'PARTIAL'] } } }),
    prisma.labResult.count({ where: { status: 'PENDING' } }),
    prisma.philHealthClaim.count({ where: { status: 'PENDING' } }),
    prisma.admission.count({ where: { status: 'ADMITTED' } }),
    prisma.room.count({ where: { isActive: true } }),
  ]);

  const occupancyRate =
    totalRooms > 0
      ? parseFloat(((admittedPatients / totalRooms) * 100).toFixed(1))
      : 0;

  successResponse(res, {
    todayRevenue: Number(todayRevenueAgg._sum.amount ?? 0),
    monthRevenue: Number(monthRevenueAgg._sum.amount ?? 0),
    yearRevenue: Number(yearRevenueAgg._sum.amount ?? 0),
    todayPatients,
    monthPatients,
    totalPatients,
    todayConsultations,
    monthConsultations,
    pendingBills,
    pendingLabResults,
    pendingPhilHealthClaims,
    occupancyRate,
  });
});

// GET /api/analytics/revenue
export const getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, groupBy = 'day' } = req.query;

  const now = new Date();
  const from = dateFrom
    ? new Date(dateFrom as string)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const to = dateTo ? new Date(dateTo as string) : now;

  // Revenue series - fetch all payments in range and group in JS
  const payments = await prisma.payment.findMany({
    where: { paidAt: { gte: from, lte: to } },
    select: { paidAt: true, amount: true, bill: { select: { patientId: true } } },
  });

  // Group by date
  const seriesMap: Record<string, number> = {};
  for (const p of payments) {
    let key: string;
    const d = new Date(p.paidAt);
    if (groupBy === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (groupBy === 'week') {
      // ISO week
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      key = `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    } else {
      key = d.toISOString().split('T')[0];
    }
    seriesMap[key] = (seriesMap[key] ?? 0) + Number(p.amount);
  }

  const series = Object.entries(seriesMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  // Revenue by doctor
  const consultBills = await prisma.bill.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { in: ['PAID', 'PARTIAL', 'FINALIZED'] },
    },
    include: {
      consultation: {
        include: {
          doctor: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const byDoctorMap: Record<string, number> = {};
  for (const b of consultBills) {
    if (b.consultation?.doctor) {
      const name = `${b.consultation.doctor.firstName} ${b.consultation.doctor.lastName}`;
      byDoctorMap[name] = (byDoctorMap[name] ?? 0) + Number(b.totalAmount);
    }
  }
  const byDoctor = Object.entries(byDoctorMap).map(([doctorName, amount]) => ({
    doctorName,
    amount,
  }));

  // Revenue by service
  const billItems = await prisma.billItem.findMany({
    where: {
      bill: {
        createdAt: { gte: from, lte: to },
        status: { in: ['PAID', 'PARTIAL', 'FINALIZED'] },
      },
    },
    include: { service: { select: { serviceName: true } } },
  });

  const byServiceMap: Record<string, number> = {};
  for (const item of billItems) {
    const name = item.service?.serviceName ?? item.description;
    byServiceMap[name] = (byServiceMap[name] ?? 0) + Number(item.total);
  }
  const byService = Object.entries(byServiceMap)
    .map(([serviceName, amount]) => ({ serviceName, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Revenue by department
  const consultDepts = await prisma.consultation.findMany({
    where: {
      scheduledAt: { gte: from, lte: to },
      status: 'COMPLETED',
      bill: { status: { in: ['PAID', 'PARTIAL', 'FINALIZED'] } },
    },
    include: {
      doctor: {
        include: { department: { select: { name: true } } },
      },
      bill: { select: { totalAmount: true } },
    },
  });

  const byDeptMap: Record<string, number> = {};
  for (const c of consultDepts) {
    const deptName = c.doctor?.department?.name ?? 'Unassigned';
    byDeptMap[deptName] = (byDeptMap[deptName] ?? 0) + Number(c.bill?.totalAmount ?? 0);
  }
  const byDepartment = Object.entries(byDeptMap).map(([deptName, amount]) => ({
    deptName,
    amount,
  }));

  successResponse(res, { series, byDoctor, byService, byDepartment });
});

// GET /api/analytics/patient-statistics
export const getPatientStatistics = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalPatients,
    newPatientsThisMonth,
    seniorCount,
    pwdCount,
    maleCount,
    femaleCount,
    otherCount,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.patient.count({ where: { isSenior: true } }),
    prisma.patient.count({ where: { isPwd: true } }),
    prisma.patient.count({ where: { gender: 'MALE' } }),
    prisma.patient.count({ where: { gender: 'FEMALE' } }),
    prisma.patient.count({ where: { gender: 'OTHER' } }),
  ]);

  // Age groups from dateOfBirth
  const patients = await prisma.patient.findMany({
    select: { dateOfBirth: true },
  });

  const ageGroups = { '0-17': 0, '18-35': 0, '36-60': 0, '60+': 0 };
  const today = new Date();
  for (const p of patients) {
    const age = today.getFullYear() - new Date(p.dateOfBirth).getFullYear();
    if (age < 18) ageGroups['0-17']++;
    else if (age <= 35) ageGroups['18-35']++;
    else if (age <= 60) ageGroups['36-60']++;
    else ageGroups['60+']++;
  }

  const byAgeGroup = Object.entries(ageGroups).map(([group, count]) => ({ group, count }));

  // Top diagnoses from consultations icdCodes
  const consultations = await prisma.consultation.findMany({
    select: { icdCodes: true },
    where: { icdCodes: { isEmpty: false } },
    take: 1000,
  });

  const diagMap: Record<string, number> = {};
  for (const c of consultations) {
    for (const code of c.icdCodes) {
      diagMap[code] = (diagMap[code] ?? 0) + 1;
    }
  }
  const topDiagnoses = Object.entries(diagMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([icdCode, count]) => ({ icdCode, count }));

  successResponse(res, {
    byGender: { male: maleCount, female: femaleCount, other: otherCount },
    byAgeGroup,
    newPatientsThisMonth,
    totalPatients,
    seniorCount,
    pwdCount,
    topDiagnoses,
  });
});

// GET /api/analytics/doctor-performance
export const getDoctorPerformance = asyncHandler(async (_req: Request, res: Response) => {
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    include: {
      consultations: {
        where: { status: 'COMPLETED' },
        include: {
          bill: { select: { totalAmount: true } },
        },
      },
    },
  });

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const daysSinceStart = Math.max(
    1,
    Math.ceil((now.getTime() - startOfYear.getTime()) / 86400000)
  );

  const result = doctors.map((doc) => {
    const totalConsultations = doc.consultations.length;
    const totalRevenue = doc.consultations.reduce(
      (s, c) => s + Number(c.bill?.totalAmount ?? 0),
      0
    );
    const avgConsultationsPerDay = parseFloat(
      (totalConsultations / daysSinceStart).toFixed(2)
    );

    return {
      id: doc.id,
      doctorName: `${doc.firstName} ${doc.lastName}`,
      specialty: doc.specialty,
      totalConsultations,
      totalRevenue,
      avgConsultationsPerDay,
    };
  });

  result.sort((a, b) => b.totalRevenue - a.totalRevenue);

  successResponse(res, result);
});

// GET /api/analytics/department-performance
export const getDepartmentPerformance = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await prisma.department.findMany({
    include: {
      doctors: {
        include: {
          consultations: {
            where: { status: 'COMPLETED' },
            include: {
              bill: { select: { totalAmount: true } },
            },
          },
        },
      },
      rooms: {
        include: {
          admissions: { where: { status: 'ADMITTED' } },
        },
      },
    },
  });

  const result = departments.map((dept) => {
    let totalConsultations = 0;
    let totalRevenue = 0;

    for (const doctor of dept.doctors) {
      totalConsultations += doctor.consultations.length;
      for (const c of doctor.consultations) {
        totalRevenue += Number(c.bill?.totalAmount ?? 0);
      }
    }

    const totalAdmissions = dept.rooms.reduce(
      (s, r) => s + r.admissions.length,
      0
    );

    return {
      deptName: dept.name,
      totalConsultations,
      totalRevenue,
      totalAdmissions,
    };
  });

  result.sort((a, b) => b.totalRevenue - a.totalRevenue);

  successResponse(res, result);
});
