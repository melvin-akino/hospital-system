/**
 * seed.ts
 *
 * Programmatic seed for embedded / first-run mode.
 * Called automatically by embedded.ts after schema migration.
 * Uses PrismaClient directly — no CLI needed.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function runSeed(prisma: PrismaClient): Promise<void> {
  console.log('[PIBS SEED] Seeding initial data...');

  // ── Users ──────────────────────────────────────────────────────────────────
  const hash12 = (pw: string) => bcrypt.hash(pw, 12);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', email: 'admin@pibs.ph', passwordHash: await hash12('admin123'), role: 'SUPER_ADMIN' },
  });

  const staffUsers = [
    { username: 'billing1',      email: 'billing@pibs.ph',      role: 'BILLING'            as const },
    { username: 'bilsup1',       email: 'bilsup@pibs.ph',       role: 'BILLING_SUPERVISOR' as const },
    { username: 'nurse1',        email: 'nurse@pibs.ph',        role: 'NURSE'              as const },
    { username: 'nurse2',        email: 'nurse2@pibs.ph',       role: 'NURSE'              as const },
    { username: 'receptionist1', email: 'receptionist@pibs.ph', role: 'RECEPTIONIST'       as const },
    { username: 'pharmacist1',   email: 'pharmacist@pibs.ph',   role: 'PHARMACIST'         as const },
    { username: 'labtech1',      email: 'labtech@pibs.ph',      role: 'LAB_TECH'           as const },
    { username: 'radtech1',      email: 'radtech@pibs.ph',      role: 'RADIOLOGY_TECH'     as const },
    { username: 'admin2',        email: 'admin2@pibs.ph',       role: 'ADMIN'              as const },
  ];
  for (const s of staffUsers) {
    await prisma.user.upsert({ where: { username: s.username }, update: {}, create: { ...s, passwordHash: await hash12('pibs2024') } });
  }

  // ── Departments ────────────────────────────────────────────────────────────
  const depts = [
    { name: 'Out-Patient Department',  code: 'OPD',     description: 'Outpatient consultations' },
    { name: 'Emergency Room',          code: 'ER',      description: '24/7 Emergency care' },
    { name: 'Laboratory',              code: 'LAB',     description: 'Diagnostic laboratory' },
    { name: 'Radiology',               code: 'RAD',     description: 'Imaging and radiology' },
    { name: 'Pharmacy',                code: 'PHAR',    description: 'Dispensing pharmacy' },
    { name: 'Intensive Care Unit',     code: 'ICU',     description: 'Critical care' },
    { name: 'Operating Room',          code: 'OR',      description: 'Surgical procedures' },
    { name: 'OB / Delivery Room',      code: 'OB',      description: 'Obstetrics and delivery' },
    { name: 'Surgery',                 code: 'SURG',    description: 'Surgical services' },
    { name: 'Pediatrics',              code: 'PED',     description: 'Children healthcare' },
    { name: 'Medical Records',         code: 'MED-REC', description: 'Medical records' },
    { name: 'Central Supply Room',     code: 'CSR',     description: 'Sterilization and supply' },
    { name: 'Admitting',               code: 'ADMIT',   description: 'Patient admitting desk' },
    { name: 'Nursing Station',         code: 'NS',      description: 'General nursing station' },
  ];
  const deptMap: Record<string, string> = {};
  for (const d of depts) {
    const rec = await prisma.department.upsert({ where: { code: d.code }, update: {}, create: d });
    deptMap[d.code] = rec.id;
  }

  // ── Department staff ───────────────────────────────────────────────────────
  const deptStaff = [
    { username: 'er.nurse1',       email: 'er.nurse1@pibs.ph',      role: 'NURSE'        as const, deptCode: 'ER',      displayName: 'Ana Reyes RN' },
    { username: 'er.doctor1',      email: 'er.doctor1@pibs.ph',     role: 'DOCTOR'       as const, deptCode: 'ER',      displayName: 'Dr. Mark Lim' },
    { username: 'icu.nurse1',      email: 'icu.nurse1@pibs.ph',     role: 'NURSE'        as const, deptCode: 'ICU',     displayName: 'Ben Torres RN' },
    { username: 'icu.doctor1',     email: 'icu.doctor1@pibs.ph',    role: 'DOCTOR'       as const, deptCode: 'ICU',     displayName: 'Dr. Liza Ong' },
    { username: 'or.nurse1',       email: 'or.nurse1@pibs.ph',      role: 'NURSE'        as const, deptCode: 'OR',      displayName: 'Maya Ramos RN' },
    { username: 'or.doctor1',      email: 'or.doctor1@pibs.ph',     role: 'DOCTOR'       as const, deptCode: 'OR',      displayName: 'Dr. Felix Tan' },
    { username: 'ob.nurse1',       email: 'ob.nurse1@pibs.ph',      role: 'NURSE'        as const, deptCode: 'OB',      displayName: 'Rose Dela Cruz RN' },
    { username: 'ob.doctor1',      email: 'ob.doctor1@pibs.ph',     role: 'DOCTOR'       as const, deptCode: 'OB',      displayName: 'Dr. Gloria Sia' },
    { username: 'admitting1',      email: 'admitting@pibs.ph',      role: 'RECEPTIONIST' as const, deptCode: 'ADMIT',   displayName: 'Luz Magno' },
    { username: 'dr.santos',       email: 'santos@pibs.ph',         role: 'DOCTOR'       as const, deptCode: 'OPD',     displayName: 'Dr. Maria Santos' },
    { username: 'dr.reyes',        email: 'reyes@pibs.ph',          role: 'DOCTOR'       as const, deptCode: 'PED',     displayName: 'Dr. Jose Reyes' },
    { username: 'dr.cruz',         email: 'cruz@pibs.ph',           role: 'DOCTOR'       as const, deptCode: 'SURG',    displayName: 'Dr. Ana Cruz' },
    { username: 'dr.ong',          email: 'ong@pibs.ph',            role: 'DOCTOR'       as const, deptCode: 'ICU',     displayName: 'Dr. Liza Ong' },
    { username: 'dr.sia',          email: 'sia@pibs.ph',            role: 'DOCTOR'       as const, deptCode: 'OB',      displayName: 'Dr. Gloria Sia' },
  ];
  for (const s of deptStaff) {
    const pw = s.role === 'DOCTOR' ? 'doctor123' : 'pibs2024';
    await prisma.user.upsert({
      where: { username: s.username }, update: {},
      create: { username: s.username, email: s.email, role: s.role, displayName: s.displayName,
                passwordHash: await hash12(pw), departmentId: deptMap[s.deptCode] ?? undefined },
    });
  }

  // ── HMO Companies ──────────────────────────────────────────────────────────
  const hmos = [
    { name: 'PhilamCare Health Systems',     code: 'PHILAM'   },
    { name: 'Maxicare Healthcare Corporation', code: 'MAXICARE' },
    { name: 'Intellicare',                   code: 'ASCEND'   },
    { name: 'Sun Life Grepa Financial',      code: 'SUNLIFE'  },
    { name: 'AXA Philippines',               code: 'AXA'      },
    { name: 'Insular Health Care',           code: 'INSULAR'  },
  ];
  for (const h of hmos) {
    await prisma.hmoCompany.upsert({ where: { code: h.code }, update: {}, create: h });
  }

  // ── Service Categories ─────────────────────────────────────────────────────
  const catNames = ['Consultation','Laboratory','Radiology','Procedures','Room Charges','Pharmacy','Surgery','Emergency'];
  const catMap: Record<string, string> = {};
  for (const name of catNames) {
    const c = await prisma.serviceCategory.upsert({ where: { name }, update: {}, create: { name } });
    catMap[name] = c.id;
  }

  // ── Services ───────────────────────────────────────────────────────────────
  const services = [
    { serviceCode:'CON-OPD',    serviceName:'OPD Consultation',           cat:'Consultation',  basePrice:500   },
    { serviceCode:'CON-SPEC',   serviceName:'Specialist Consultation',    cat:'Consultation',  basePrice:1000  },
    { serviceCode:'CON-ER',     serviceName:'Emergency Consultation',     cat:'Consultation',  basePrice:750   },
    { serviceCode:'LAB-CBC',    serviceName:'Complete Blood Count (CBC)', cat:'Laboratory',    basePrice:350   },
    { serviceCode:'LAB-UA',     serviceName:'Urinalysis',                 cat:'Laboratory',    basePrice:150   },
    { serviceCode:'LAB-FBS',    serviceName:'Fasting Blood Sugar',        cat:'Laboratory',    basePrice:200   },
    { serviceCode:'LAB-LIPID',  serviceName:'Lipid Profile',              cat:'Laboratory',    basePrice:600   },
    { serviceCode:'LAB-LFT',    serviceName:'Liver Function Test',        cat:'Laboratory',    basePrice:900   },
    { serviceCode:'LAB-THY',    serviceName:'Thyroid Panel (TSH)',        cat:'Laboratory',    basePrice:1500  },
    { serviceCode:'RAD-CXR',    serviceName:'Chest X-Ray (PA)',           cat:'Radiology',     basePrice:500   },
    { serviceCode:'RAD-ULTABD', serviceName:'Ultrasound - Whole Abdomen', cat:'Radiology',     basePrice:1200  },
    { serviceCode:'RAD-CTH',    serviceName:'CT Scan - Head',             cat:'Radiology',     basePrice:5000  },
    { serviceCode:'RAD-MRI',    serviceName:'MRI - Brain',               cat:'Radiology',     basePrice:9000  },
    { serviceCode:'RAD-ECG',    serviceName:'ECG / 12-Lead',             cat:'Radiology',     basePrice:400   },
    { serviceCode:'PROC-IV',    serviceName:'IV Insertion',              cat:'Procedures',    basePrice:200   },
    { serviceCode:'PROC-WOUND', serviceName:'Wound Dressing',            cat:'Procedures',    basePrice:300   },
    { serviceCode:'PROC-SUTURE',serviceName:'Wound Suturing',            cat:'Procedures',    basePrice:800   },
    { serviceCode:'ROOM-PRIVATE',serviceName:'Private Room (per day)',   cat:'Room Charges',  basePrice:3500  },
    { serviceCode:'ROOM-SEMI',  serviceName:'Semi-Private Room (per day)',cat:'Room Charges', basePrice:2000  },
    { serviceCode:'ROOM-WARD',  serviceName:'Ward (per day)',            cat:'Room Charges',  basePrice:800   },
    { serviceCode:'ROOM-ICU',   serviceName:'ICU (per day)',             cat:'Room Charges',  basePrice:8000  },
    { serviceCode:'ER-TRIAGE',  serviceName:'Emergency Triage Fee',      cat:'Emergency',     basePrice:300, isDiscountable:false },
  ];
  for (const s of services) {
    await prisma.service.upsert({
      where: { serviceCode: s.serviceCode }, update: {},
      create: { serviceCode:s.serviceCode, serviceName:s.serviceName, categoryId:catMap[s.cat],
                basePrice:s.basePrice, isDiscountable: s.isDiscountable ?? true },
    });
  }

  // ── PhilHealth Case Rates ──────────────────────────────────────────────────
  const caseRates = [
    { icdCode:'J18.0', description:'Pneumonia, unspecified',      caseRate:15000, category:'Respiratory'    },
    { icdCode:'I21.0', description:'Acute myocardial infarction', caseRate:28000, category:'Cardiovascular' },
    { icdCode:'O80',   description:'Normal delivery',             caseRate:6500,  category:'Obstetrics'     },
    { icdCode:'O82',   description:'Cesarean section delivery',   caseRate:19000, category:'Obstetrics'     },
    { icdCode:'E11.0', description:'Type 2 diabetes mellitus',    caseRate:6000,  category:'Endocrine'      },
    { icdCode:'I10',   description:'Essential hypertension',      caseRate:3500,  category:'Cardiovascular' },
    { icdCode:'N39.0', description:'Urinary tract infection',     caseRate:4200,  category:'Urinary'        },
  ];
  for (const cr of caseRates) {
    const exists = await prisma.philHealthCaseRate.findFirst({ where: { icdCode: cr.icdCode } });
    if (!exists) await prisma.philHealthCaseRate.create({ data: cr });
  }

  // ── Room Types ─────────────────────────────────────────────────────────────
  const roomTypes = [
    { name:'Private Room',    ratePerDay:3500,  description:'Single-occupancy private room' },
    { name:'Semi-Private Room',ratePerDay:2000, description:'Two-bed room' },
    { name:'Ward',            ratePerDay:800,   description:'Multi-bed ward' },
    { name:'ICU',             ratePerDay:8000,  description:'Intensive Care Unit' },
    { name:'NICU',            ratePerDay:6000,  description:'Neonatal ICU' },
    { name:'OR Suite',        ratePerDay:15000, description:'Operating Room Suite' },
  ];
  const rtMap: Record<string, string> = {};
  for (const rt of roomTypes) {
    const r = await prisma.roomType.upsert({ where: { name: rt.name }, update: {}, create: rt }).catch(async () => {
      const found = await prisma.roomType.findFirst({ where: { name: rt.name } });
      return found!;
    });
    if (r) rtMap[rt.name] = r.id;
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const roomDefs = [
    { roomNumber:'101', floor:'1', building:'Main',   typeName:'Private Room'     },
    { roomNumber:'102', floor:'1', building:'Main',   typeName:'Private Room'     },
    { roomNumber:'103', floor:'1', building:'Main',   typeName:'Private Room'     },
    { roomNumber:'201', floor:'2', building:'Main',   typeName:'Semi-Private Room'},
    { roomNumber:'202', floor:'2', building:'Main',   typeName:'Semi-Private Room'},
    { roomNumber:'W1A', floor:'1', building:'Wing A', typeName:'Ward'             },
    { roomNumber:'W1B', floor:'1', building:'Wing A', typeName:'Ward'             },
    { roomNumber:'ICU-1',floor:'3',building:'Main',   typeName:'ICU'              },
    { roomNumber:'ICU-2',floor:'3',building:'Main',   typeName:'ICU'              },
    { roomNumber:'NICU-1',floor:'3',building:'Main',  typeName:'NICU'             },
    { roomNumber:'OR-1', floor:'4',building:'Main',   typeName:'OR Suite'         },
    { roomNumber:'OR-2', floor:'4',building:'Main',   typeName:'OR Suite'         },
  ];
  for (const r of roomDefs) {
    if (!rtMap[r.typeName]) continue;
    const exists = await prisma.room.findUnique({ where: { roomNumber: r.roomNumber } });
    if (!exists) await prisma.room.create({ data: { roomNumber:r.roomNumber, floor:r.floor, building:r.building, roomTypeId:rtMap[r.typeName] } });
  }

  // ── Chart of Accounts ──────────────────────────────────────────────────────
  const accounts = [
    { accountCode:'1000', accountName:'Cash on Hand',           accountType:'ASSET'     },
    { accountCode:'1100', accountName:'Accounts Receivable',    accountType:'ASSET'     },
    { accountCode:'1120', accountName:'HMO Receivable',         accountType:'ASSET'     },
    { accountCode:'1130', accountName:'PhilHealth Receivable',  accountType:'ASSET'     },
    { accountCode:'1210', accountName:'Pharmacy Inventory',     accountType:'ASSET'     },
    { accountCode:'2000', accountName:'Accounts Payable',       accountType:'LIABILITY' },
    { accountCode:'2200', accountName:'SSS/PhilHealth/Pag-IBIG Payable', accountType:'LIABILITY' },
    { accountCode:'3000', accountName:"Owner's Equity",         accountType:'EQUITY'    },
    { accountCode:'3100', accountName:'Retained Earnings',      accountType:'EQUITY'    },
    { accountCode:'4000', accountName:'Patient Service Revenue',accountType:'REVENUE'   },
    { accountCode:'4200', accountName:'Laboratory Revenue',     accountType:'REVENUE'   },
    { accountCode:'4400', accountName:'Pharmacy Revenue',       accountType:'REVENUE'   },
    { accountCode:'4500', accountName:'Room and Board Revenue', accountType:'REVENUE'   },
    { accountCode:'5000', accountName:'Salaries and Wages',     accountType:'EXPENSE'   },
    { accountCode:'5200', accountName:'Pharmacy Cost of Goods', accountType:'EXPENSE'   },
  ];
  for (const a of accounts) {
    const exists = await prisma.chartOfAccounts.findUnique({ where: { accountCode: a.accountCode } });
    if (!exists) await prisma.chartOfAccounts.create({ data: a });
  }

  // ── Sample Patients ────────────────────────────────────────────────────────
  const patients = [
    { patientNo:'PAT-000001', firstName:'Juan',    lastName:'Cruz',      dateOfBirth:new Date('1985-03-15'), gender:'MALE'   as const, phone:'09171111111', city:'Manila'       },
    { patientNo:'PAT-000002', firstName:'Maria',   lastName:'Reyes',     dateOfBirth:new Date('1948-07-20'), gender:'FEMALE' as const, phone:'09282222222', isSenior:true, seniorIdNo:'SC-2018-001', philhealthNo:'PH-12-345678901' },
    { patientNo:'PAT-000003', firstName:'Pedro',   lastName:'Santos',    dateOfBirth:new Date('1990-12-01'), gender:'MALE'   as const, phone:'09393333333', isPwd:true,    pwdIdNo:'PWD-2020-001' },
    { patientNo:'PAT-000004', firstName:'Luisa',   lastName:'Mendoza',   dateOfBirth:new Date('1972-05-10'), gender:'FEMALE' as const, phone:'09174444444', city:'Pasig'        },
    { patientNo:'PAT-000005', firstName:'Roberto', lastName:'Villanueva',dateOfBirth:new Date('1965-09-25'), gender:'MALE'   as const, phone:'09285555555', city:'Makati'       },
    { patientNo:'PAT-000006', firstName:'Celine',  lastName:'Aguilar',   dateOfBirth:new Date('1998-01-30'), gender:'FEMALE' as const, phone:'09396666666', city:'Mandaluyong'  },
  ];
  for (const p of patients) {
    const exists = await prisma.patient.findUnique({ where: { patientNo: p.patientNo } });
    if (!exists) await prisma.patient.create({ data: p });
  }

  // ── Medications & Inventory ────────────────────────────────────────────────
  const meds = [
    { genericName:'Amoxicillin',   brandName:'Amoxil',     dosageForm:'Capsule',    strength:'500mg',       stock:500,  min:100, unitCost:5.5,   price:12,    unit:'capsule'    },
    { genericName:'Paracetamol',   brandName:'Biogesic',   dosageForm:'Tablet',     strength:'500mg',       stock:1000, min:200, unitCost:1.5,   price:4,     unit:'tablet'     },
    { genericName:'Amlodipine',    brandName:'Norvasc',    dosageForm:'Tablet',     strength:'5mg',         stock:300,  min:100, unitCost:8,     price:18,    unit:'tablet'     },
    { genericName:'Metformin',     brandName:'Glucophage', dosageForm:'Tablet',     strength:'500mg',       stock:400,  min:100, unitCost:5,     price:12,    unit:'tablet'     },
    { genericName:'Omeprazole',    brandName:'Losec',      dosageForm:'Capsule',    strength:'20mg',        stock:350,  min:100, unitCost:10,    price:25,    unit:'capsule'    },
    { genericName:'Salbutamol',    brandName:'Ventolin',   dosageForm:'Inhaler',    strength:'100mcg/dose', stock:50,   min:20,  unitCost:120,   price:280,   unit:'inhaler'    },
    { genericName:'IV Fluid NaCl', brandName:'Baxter',     dosageForm:'IV Solution',strength:'0.9%',        stock:200,  min:50,  unitCost:45,    price:95,    unit:'bag (1L)'   },
  ];
  let idx = 1;
  for (const m of meds) {
    const exists = await prisma.medication.findFirst({ where: { genericName: m.genericName, strength: m.strength } });
    if (!exists) {
      const med = await prisma.medication.create({ data: { genericName:m.genericName, brandName:m.brandName, dosageForm:m.dosageForm, strength:m.strength } });
      await prisma.inventoryItem.create({ data: {
        medicationId:med.id, itemName:`${m.genericName} ${m.strength}`,
        itemCode:`MED-${String(idx++).padStart(4,'0')}`, unit:m.unit,
        currentStock:m.stock, minimumStock:m.min, unitCost:m.unitCost, sellingPrice:m.price,
        expiryDate:new Date(Date.now()+365*86400000), batchNo:`BATCH-INIT-${idx}`, location:'Main Pharmacy',
      }});
    } else { idx++; }
  }

  // ── SMS Templates ──────────────────────────────────────────────────────────
  const smsTemplates = [
    { name:'appointment_reminder',  template:'Dear {patient_name}, reminder for your appointment on {date} at {time} with Dr. {doctor_name}.', category:'appointment' },
    { name:'lab_result_ready',      template:'Dear {patient_name}, your laboratory results are now available. Call {phone} to inquire.',        category:'laboratory'  },
    { name:'bill_payment_reminder', template:'Dear {patient_name}, your outstanding balance is PHP {amount}. Please settle at your convenience.',category:'billing'     },
  ];
  for (const t of smsTemplates) {
    const exists = await prisma.smsTemplate.findUnique({ where: { name: t.name } });
    if (!exists) await prisma.smsTemplate.create({ data: t });
  }

  // ── Dialysis Machines ──────────────────────────────────────────────────────
  const machines = [
    { machineCode:'DM-001', model:'Fresenius 5008S', status:'AVAILABLE' },
    { machineCode:'DM-002', model:'Fresenius 5008S', status:'AVAILABLE' },
    { machineCode:'DM-003', model:'Nipro NCV-12',    status:'AVAILABLE' },
  ];
  for (const m of machines) {
    const exists = await prisma.dialysisMachine.findFirst({ where: { machineCode: m.machineCode } });
    if (!exists) await prisma.dialysisMachine.create({ data: m });
  }

  console.log('[PIBS SEED] Done.');
  console.log('[PIBS SEED] Login: admin / admin123');
  console.log('[PIBS SEED] Staff: billing1, nurse1, pharmacist1, labtech1 / pibs2024');
  console.log('[PIBS SEED] Doctors: dr.santos, dr.reyes, dr.cruz / doctor123');
}
