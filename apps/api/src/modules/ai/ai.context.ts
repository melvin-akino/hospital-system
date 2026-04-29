/**
 * ai.context.ts
 *
 * Builds a rich, structured patient context object from Prisma data.
 * Injected into every AI prompt that needs patient-aware responses.
 */

import { prisma } from '../../lib/prisma';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PatientAIContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodType: string | null;
  isSenior: boolean;
  isPwd: boolean;
  philhealthNo: string | null;
  allergies: Array<{ allergen: string; severity: string; reaction: string | null }>;
  activeMedications: Array<{ drugName: string; dosage: string | null; frequency: string | null }>;
  activeProblems: Array<{ problem: string; icdCode: string | null; status: string; severity: string | null }>;
  recentVitals: Array<{
    recordedAt: Date;
    temperature: number | null;
    bp: string | null;
    heartRate: number | null;
    respiratoryRate: number | null;
    oxygenSaturation: number | null;
    weight: number | null;
  }>;
  recentLabs: Array<{
    testName: string;
    result: string | null;
    unit: string | null;
    referenceRange: string | null;
    isAbnormal: boolean;
    performedAt: Date | null;
  }>;
  recentConsultations: Array<{
    date: Date;
    type: string;
    chiefComplaint: string | null;
    assessment: string | null;
    treatmentPlan: string | null;
    icdCodes: string[];
    doctorName: string;
  }>;
  admissionHistory: {
    total: number;
    last30Days: number;
  };
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function calcAge(dob: Date): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

// ── Builder ────────────────────────────────────────────────────────────────────

export async function buildPatientContext(patientId: string): Promise<PatientAIContext | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      allergies:   { where: { isActive: true } },
      medications: { where: { isActive: true } },
      problems:    { where: { status: { in: ['ACTIVE', 'CHRONIC'] } } },
      vitalSigns:  { orderBy: { recordedAt: 'desc' }, take: 5 },
      labResults: {
        where:   { performedAt: { gte: thirtyDaysAgo } },
        orderBy: { performedAt: 'desc' },
        take:    30,
      },
      consultations: {
        where:   { status: 'COMPLETED' },
        orderBy: { scheduledAt: 'desc' },
        take:    5,
        include: { doctor: { select: { firstName: true, lastName: true } } },
      },
      admissions: { select: { id: true, admittedAt: true } },
    },
  });

  if (!patient) return null;

  const age = calcAge(patient.dateOfBirth);

  return {
    id:          patient.id,
    name:        `${patient.firstName} ${patient.lastName}`,
    age,
    gender:      patient.gender,
    bloodType:   patient.bloodType,
    isSenior:    patient.isSenior,
    isPwd:       patient.isPwd,
    philhealthNo: patient.philhealthNo,

    allergies: patient.allergies.map(a => ({
      allergen: a.allergen,
      severity: a.severity,
      reaction: a.reaction,
    })),

    activeMedications: patient.medications.map(m => ({
      drugName:  m.drugName,
      dosage:    m.dosage,
      frequency: m.frequency,
    })),

    activeProblems: patient.problems.map(p => ({
      problem:  p.problem,
      icdCode:  p.icdCode,
      status:   p.status,
      severity: p.severity,
    })),

    recentVitals: patient.vitalSigns.map(v => ({
      recordedAt:      v.recordedAt,
      temperature:     v.temperature     ? Number(v.temperature)     : null,
      bp:              v.bloodPressureSystolic != null
                         ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
                         : null,
      heartRate:       v.heartRate,
      respiratoryRate: v.respiratoryRate,
      oxygenSaturation: v.oxygenSaturation ? Number(v.oxygenSaturation) : null,
      weight:          v.weight           ? Number(v.weight)           : null,
    })),

    recentLabs: patient.labResults.map(lr => ({
      testName:       lr.testName,
      result:         lr.result,
      unit:           lr.unit,
      referenceRange: lr.referenceRange,
      isAbnormal:     lr.isAbnormal,
      performedAt:    lr.performedAt,
    })),

    recentConsultations: patient.consultations.map(c => ({
      date:           c.scheduledAt,
      type:           c.consultationType,
      chiefComplaint: c.chiefComplaint,
      assessment:     c.assessment,
      treatmentPlan:  c.treatmentPlan,
      icdCodes:       c.icdCodes,
      doctorName:     c.doctor
                        ? `Dr. ${c.doctor.firstName} ${c.doctor.lastName}`
                        : 'Unknown',
    })),

    admissionHistory: {
      total:      patient.admissions.length,
      last30Days: patient.admissions.filter(
        a => new Date(a.admittedAt) >= thirtyDaysAgo
      ).length,
    },
  };
}

// ── Serialise context to plain text for prompt injection ───────────────────────

export function formatContextForPrompt(ctx: PatientAIContext): string {
  const lines: string[] = [];

  lines.push(
    `Patient: ${ctx.name}, ${ctx.age} years old, ${ctx.gender}` +
    (ctx.bloodType ? `, Blood type: ${ctx.bloodType}` : '')
  );

  if (ctx.isSenior) lines.push('Note: Senior Citizen');
  if (ctx.isPwd)    lines.push('Note: Person with Disability');

  if (ctx.allergies.length > 0) {
    lines.push(
      'Known allergies: ' +
      ctx.allergies
        .map(a => `${a.allergen} (${a.severity}${a.reaction ? ' — ' + a.reaction : ''})`)
        .join('; ')
    );
  } else {
    lines.push('Known allergies: None on record');
  }

  if (ctx.activeMedications.length > 0) {
    lines.push(
      'Current medications: ' +
      ctx.activeMedications
        .map(m => `${m.drugName}${m.dosage ? ' ' + m.dosage : ''}${m.frequency ? ' ' + m.frequency : ''}`)
        .join('; ')
    );
  } else {
    lines.push('Current medications: None on record');
  }

  if (ctx.activeProblems.length > 0) {
    lines.push(
      'Active/chronic problems: ' +
      ctx.activeProblems
        .map(p => `${p.problem}${p.icdCode ? ' (' + p.icdCode + ')' : ''} [${p.status}${p.severity ? ', ' + p.severity : ''}]`)
        .join('; ')
    );
  }

  if (ctx.recentVitals.length > 0) {
    const v = ctx.recentVitals[0]!;
    const parts: string[] = [];
    if (v.temperature)     parts.push(`Temp ${v.temperature}°C`);
    if (v.bp)              parts.push(`BP ${v.bp} mmHg`);
    if (v.heartRate)       parts.push(`HR ${v.heartRate} bpm`);
    if (v.respiratoryRate) parts.push(`RR ${v.respiratoryRate}/min`);
    if (v.oxygenSaturation)parts.push(`SpO2 ${v.oxygenSaturation}%`);
    if (parts.length > 0)  lines.push(`Latest vitals: ${parts.join(', ')}`);
  }

  if (ctx.recentLabs.length > 0) {
    const abnormal = ctx.recentLabs.filter(l => l.isAbnormal);
    const normal   = ctx.recentLabs.filter(l => !l.isAbnormal);
    if (abnormal.length > 0) {
      lines.push(
        'Abnormal lab results: ' +
        abnormal
          .map(l => `${l.testName}: ${l.result ?? 'N/A'}${l.unit ? ' ' + l.unit : ''} (ref: ${l.referenceRange ?? 'N/A'})`)
          .join('; ')
      );
    }
    if (normal.length > 0) {
      lines.push(
        'Normal lab results: ' +
        normal
          .map(l => `${l.testName}: ${l.result ?? 'N/A'}${l.unit ? ' ' + l.unit : ''}`)
          .join('; ')
      );
    }
  }

  if (ctx.recentConsultations.length > 0) {
    const last = ctx.recentConsultations[0]!;
    lines.push(
      `Most recent consultation: ${last.date.toISOString().slice(0, 10)} with ${last.doctorName}` +
      (last.chiefComplaint ? ` — Chief complaint: ${last.chiefComplaint}` : '') +
      (last.assessment     ? ` — Assessment: ${last.assessment}`          : '')
    );
  }

  lines.push(`Admission history: ${ctx.admissionHistory.total} total, ${ctx.admissionHistory.last30Days} in last 30 days`);
  lines.push('Setting: Philippine hospital context');

  return lines.join('\n');
}
