import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Admin user
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@pibs.ph',
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Created admin user:', admin.username);

  // Additional staff users
  const staffUsers = [
    { username: 'billing1', email: 'billing@pibs.ph', role: 'BILLING' as const },
    { username: 'nurse1', email: 'nurse@pibs.ph', role: 'NURSE' as const },
    { username: 'receptionist1', email: 'receptionist@pibs.ph', role: 'RECEPTIONIST' as const },
  ];

  for (const staff of staffUsers) {
    const hash = await bcrypt.hash('pibs2024', 12);
    await prisma.user.upsert({
      where: { username: staff.username },
      update: {},
      create: { ...staff, passwordHash: hash },
    });
  }

  // 2. Departments
  const departments = [
    { name: 'Out-Patient Department', code: 'OPD', description: 'Outpatient consultations' },
    { name: 'Emergency Room', code: 'ER', description: '24/7 Emergency care' },
    { name: 'Laboratory', code: 'LAB', description: 'Diagnostic laboratory' },
    { name: 'Radiology', code: 'RAD', description: 'Imaging and radiology' },
    { name: 'Pharmacy', code: 'PHAR', description: 'Dispensing pharmacy' },
    { name: 'Intensive Care Unit', code: 'ICU', description: 'Critical care' },
    { name: 'Surgery', code: 'SURG', description: 'Surgical services' },
    { name: 'Pediatrics', code: 'PED', description: 'Children healthcare' },
  ];

  const createdDepts: Record<string, string> = {};
  for (const dept of departments) {
    const d = await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
    createdDepts[dept.code] = d.id;
  }
  console.log('Created departments');

  // 3. HMO Companies
  const hmoCompanies = [
    { name: 'PhilamCare Health Systems', code: 'PHILAM' },
    { name: 'Sun Life Grepa Financial', code: 'SUNLIFE' },
    { name: 'AXA Philippines', code: 'AXA' },
    { name: 'Metrobank Card Corporation', code: 'METRO' },
    { name: 'Insular Health Care', code: 'INSULAR' },
    { name: 'United Healthcare Philippines', code: 'UNITED' },
    { name: 'Maxicare Healthcare Corporation', code: 'MAXICARE' },
    { name: 'Intellicare', code: 'ASCEND' },
  ];

  for (const hmo of hmoCompanies) {
    await prisma.hmoCompany.upsert({
      where: { code: hmo.code },
      update: {},
      create: hmo,
    });
  }
  console.log('Created HMO companies');

  // 4. Service Categories
  const categories = [
    { name: 'Consultation', description: 'Doctor consultation fees' },
    { name: 'Laboratory', description: 'Lab tests and diagnostics' },
    { name: 'Radiology', description: 'X-Ray, CT, MRI, Ultrasound' },
    { name: 'Procedures', description: 'Medical procedures' },
    { name: 'Room Charges', description: 'Hospital room and accommodation' },
    { name: 'Pharmacy', description: 'Medicines and supplies' },
    { name: 'Surgery', description: 'Surgical procedures' },
    { name: 'Emergency', description: 'Emergency services' },
  ];

  const createdCats: Record<string, string> = {};
  for (const cat of categories) {
    const c = await prisma.serviceCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    createdCats[cat.name] = c.id;
  }
  console.log('Created service categories');

  // 5. Services
  const services = [
    // Consultation
    { serviceCode: 'CON-OPD', serviceName: 'OPD Consultation', categoryId: createdCats['Consultation'], basePrice: 500 },
    { serviceCode: 'CON-SPEC', serviceName: 'Specialist Consultation', categoryId: createdCats['Consultation'], basePrice: 1000 },
    { serviceCode: 'CON-ER', serviceName: 'Emergency Consultation', categoryId: createdCats['Consultation'], basePrice: 750 },
    // Laboratory
    { serviceCode: 'LAB-CBC', serviceName: 'Complete Blood Count (CBC)', categoryId: createdCats['Laboratory'], basePrice: 350 },
    { serviceCode: 'LAB-UA', serviceName: 'Urinalysis', categoryId: createdCats['Laboratory'], basePrice: 150 },
    { serviceCode: 'LAB-FBS', serviceName: 'Fasting Blood Sugar', categoryId: createdCats['Laboratory'], basePrice: 200 },
    { serviceCode: 'LAB-LIPID', serviceName: 'Lipid Profile', categoryId: createdCats['Laboratory'], basePrice: 600 },
    { serviceCode: 'LAB-LFT', serviceName: 'Liver Function Test', categoryId: createdCats['Laboratory'], basePrice: 900 },
    { serviceCode: 'LAB-KFT', serviceName: 'Kidney Function Test', categoryId: createdCats['Laboratory'], basePrice: 850 },
    { serviceCode: 'LAB-THY', serviceName: 'Thyroid Panel (TSH/FT3/FT4)', categoryId: createdCats['Laboratory'], basePrice: 1500 },
    { serviceCode: 'LAB-COVID', serviceName: 'COVID-19 Antigen Test', categoryId: createdCats['Laboratory'], basePrice: 500 },
    // Radiology
    { serviceCode: 'RAD-CXR', serviceName: 'Chest X-Ray (PA)', categoryId: createdCats['Radiology'], basePrice: 500 },
    { serviceCode: 'RAD-KUB', serviceName: 'KUB X-Ray', categoryId: createdCats['Radiology'], basePrice: 600 },
    { serviceCode: 'RAD-ULTABD', serviceName: 'Ultrasound - Whole Abdomen', categoryId: createdCats['Radiology'], basePrice: 1200 },
    { serviceCode: 'RAD-CTH', serviceName: 'CT Scan - Head', categoryId: createdCats['Radiology'], basePrice: 5000 },
    { serviceCode: 'RAD-CTABD', serviceName: 'CT Scan - Abdomen', categoryId: createdCats['Radiology'], basePrice: 7000 },
    { serviceCode: 'RAD-MRI', serviceName: 'MRI - Brain', categoryId: createdCats['Radiology'], basePrice: 9000 },
    { serviceCode: 'RAD-ECG', serviceName: 'ECG / 12-Lead', categoryId: createdCats['Radiology'], basePrice: 400 },
    // Procedures
    { serviceCode: 'PROC-IV', serviceName: 'IV Insertion', categoryId: createdCats['Procedures'], basePrice: 200 },
    { serviceCode: 'PROC-WOUND', serviceName: 'Wound Dressing', categoryId: createdCats['Procedures'], basePrice: 300 },
    { serviceCode: 'PROC-SUTURE', serviceName: 'Wound Suturing', categoryId: createdCats['Procedures'], basePrice: 800 },
    { serviceCode: 'PROC-NEBULIZE', serviceName: 'Nebulization', categoryId: createdCats['Procedures'], basePrice: 250 },
    // Room charges
    { serviceCode: 'ROOM-PRIVATE', serviceName: 'Private Room (per day)', categoryId: createdCats['Room Charges'], basePrice: 3500 },
    { serviceCode: 'ROOM-SEMI', serviceName: 'Semi-Private Room (per day)', categoryId: createdCats['Room Charges'], basePrice: 2000 },
    { serviceCode: 'ROOM-WARD', serviceName: 'Ward (per day)', categoryId: createdCats['Room Charges'], basePrice: 800 },
    { serviceCode: 'ROOM-ICU', serviceName: 'ICU (per day)', categoryId: createdCats['Room Charges'], basePrice: 8000 },
    // Emergency
    { serviceCode: 'ER-TRIAGE', serviceName: 'Emergency Triage Fee', categoryId: createdCats['Emergency'], basePrice: 300, isDiscountable: false },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { serviceCode: svc.serviceCode },
      update: {},
      create: {
        ...svc,
        isDiscountable: svc.isDiscountable !== undefined ? svc.isDiscountable : true,
      },
    });
  }
  console.log('Created services');

  // 6. PhilHealth Case Rates
  const caseRates = [
    { icdCode: 'A01.0', description: 'Typhoid fever', caseRate: 8000, category: 'Infectious Disease' },
    { icdCode: 'J18.0', description: 'Pneumonia, unspecified', caseRate: 15000, category: 'Respiratory' },
    { icdCode: 'I21.0', description: 'Acute myocardial infarction', caseRate: 28000, category: 'Cardiovascular' },
    { icdCode: 'N39.0', description: 'Urinary tract infection', caseRate: 4200, category: 'Urinary' },
    { icdCode: 'K80.0', description: 'Cholelithiasis (gallstones)', caseRate: 18000, category: 'Gastrointestinal' },
    { icdCode: 'O80', description: 'Normal delivery', caseRate: 6500, category: 'Obstetrics' },
    { icdCode: 'O82', description: 'Cesarean section delivery', caseRate: 19000, category: 'Obstetrics' },
    { icdCode: 'J45.0', description: 'Predominantly allergic asthma', caseRate: 5500, category: 'Respiratory' },
    { icdCode: 'E11.0', description: 'Type 2 diabetes mellitus', caseRate: 6000, category: 'Endocrine' },
    { icdCode: 'I10', description: 'Essential hypertension', caseRate: 3500, category: 'Cardiovascular' },
    { icdCode: 'G40.0', description: 'Epilepsy', caseRate: 7000, category: 'Neurological' },
    { icdCode: 'M16.0', description: 'Hip osteoarthritis', caseRate: 25000, category: 'Musculoskeletal' },
  ];

  for (const cr of caseRates) {
    const existing = await prisma.philHealthCaseRate.findFirst({ where: { icdCode: cr.icdCode } });
    if (!existing) {
      await prisma.philHealthCaseRate.create({ data: cr });
    }
  }
  console.log('Created PhilHealth case rates');

  // 7. Doctors
  const doctorUser1 = await prisma.user.upsert({
    where: { username: 'dr.santos' },
    update: {},
    create: {
      username: 'dr.santos',
      email: 'santos@pibs.ph',
      passwordHash: await bcrypt.hash('doctor123', 12),
      role: 'DOCTOR',
    },
  });

  const doctorUser2 = await prisma.user.upsert({
    where: { username: 'dr.reyes' },
    update: {},
    create: {
      username: 'dr.reyes',
      email: 'reyes@pibs.ph',
      passwordHash: await bcrypt.hash('doctor123', 12),
      role: 'DOCTOR',
    },
  });

  const doctorUser3 = await prisma.user.upsert({
    where: { username: 'dr.cruz' },
    update: {},
    create: {
      username: 'dr.cruz',
      email: 'cruz@pibs.ph',
      passwordHash: await bcrypt.hash('doctor123', 12),
      role: 'DOCTOR',
    },
  });

  const doctors = [
    {
      userId: doctorUser1.id,
      doctorNo: 'DOC-000001',
      firstName: 'Maria',
      middleName: 'Garcia',
      lastName: 'Santos',
      licenseNo: 'PRC-2023-12345',
      specialty: 'Internal Medicine',
      subspecialty: 'Gastroenterology',
      departmentId: createdDepts['OPD'],
      consultingFee: 1000,
      phone: '09171234567',
      email: 'santos@pibs.ph',
    },
    {
      userId: doctorUser2.id,
      doctorNo: 'DOC-000002',
      firstName: 'Jose',
      middleName: 'Manuel',
      lastName: 'Reyes',
      licenseNo: 'PRC-2022-67890',
      specialty: 'Pediatrics',
      departmentId: createdDepts['PED'],
      consultingFee: 800,
      phone: '09281234567',
      email: 'reyes@pibs.ph',
    },
    {
      userId: doctorUser3.id,
      doctorNo: 'DOC-000003',
      firstName: 'Ana',
      middleName: 'Dela',
      lastName: 'Cruz',
      licenseNo: 'PRC-2021-11111',
      specialty: 'Surgery',
      subspecialty: 'General Surgery',
      departmentId: createdDepts['SURG'],
      consultingFee: 1500,
      phone: '09391234567',
      email: 'cruz@pibs.ph',
    },
  ];

  for (const doc of doctors) {
    const existing = await prisma.doctor.findUnique({ where: { doctorNo: doc.doctorNo } });
    if (!existing) {
      const created = await prisma.doctor.create({ data: doc });

      // Create schedules for each doctor (Mon-Fri 8AM-5PM)
      for (let day = 1; day <= 5; day++) {
        await prisma.doctorSchedule.create({
          data: {
            doctorId: created.id,
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '17:00',
            slotDuration: 30,
          },
        });
      }
    }
  }
  console.log('Created doctors');

  // 8. Room Types
  const roomTypes = [
    { name: 'Private Room', ratePerDay: 3500, description: 'Single-occupancy private room with bathroom' },
    { name: 'Semi-Private Room', ratePerDay: 2000, description: 'Two-bed room with shared bathroom' },
    { name: 'Ward', ratePerDay: 800, description: 'Multi-bed ward' },
    { name: 'ICU', ratePerDay: 8000, description: 'Intensive Care Unit' },
    { name: 'NICU', ratePerDay: 6000, description: 'Neonatal Intensive Care Unit' },
    { name: 'OR Suite', ratePerDay: 15000, description: 'Operating Room Suite' },
  ];

  for (const rt of roomTypes) {
    const existing = await prisma.roomType.findUnique({ where: { name: rt.name } });
    if (!existing) {
      await prisma.roomType.create({ data: rt });
    }
  }
  console.log('Created room types');

  // 9. Chart of Accounts (Basic Hospital COA)
  const accounts = [
    // Assets
    { accountCode: '1000', accountName: 'Cash on Hand', accountType: 'ASSET' },
    { accountCode: '1100', accountName: 'Accounts Receivable', accountType: 'ASSET' },
    { accountCode: '1110', accountName: 'Patients Receivable', accountType: 'ASSET' },
    { accountCode: '1120', accountName: 'HMO Receivable', accountType: 'ASSET' },
    { accountCode: '1130', accountName: 'PhilHealth Receivable', accountType: 'ASSET' },
    { accountCode: '1200', accountName: 'Medical Supplies Inventory', accountType: 'ASSET' },
    { accountCode: '1210', accountName: 'Pharmacy Inventory', accountType: 'ASSET' },
    { accountCode: '1300', accountName: 'Prepaid Expenses', accountType: 'ASSET' },
    { accountCode: '1500', accountName: 'Medical Equipment', accountType: 'ASSET' },
    { accountCode: '1510', accountName: 'Accumulated Depreciation - Equipment', accountType: 'ASSET' },
    // Liabilities
    { accountCode: '2000', accountName: 'Accounts Payable', accountType: 'LIABILITY' },
    { accountCode: '2100', accountName: 'Accrued Expenses', accountType: 'LIABILITY' },
    { accountCode: '2200', accountName: 'SSS/PhilHealth/Pag-IBIG Payable', accountType: 'LIABILITY' },
    { accountCode: '2300', accountName: 'Income Tax Payable', accountType: 'LIABILITY' },
    { accountCode: '2400', accountName: 'VAT Payable', accountType: 'LIABILITY' },
    // Equity
    { accountCode: '3000', accountName: "Owner's Equity", accountType: 'EQUITY' },
    { accountCode: '3100', accountName: 'Retained Earnings', accountType: 'EQUITY' },
    // Revenue
    { accountCode: '4000', accountName: 'Patient Service Revenue', accountType: 'REVENUE' },
    { accountCode: '4100', accountName: 'Consultation Revenue', accountType: 'REVENUE' },
    { accountCode: '4200', accountName: 'Laboratory Revenue', accountType: 'REVENUE' },
    { accountCode: '4300', accountName: 'Radiology Revenue', accountType: 'REVENUE' },
    { accountCode: '4400', accountName: 'Pharmacy Revenue', accountType: 'REVENUE' },
    { accountCode: '4500', accountName: 'Room and Board Revenue', accountType: 'REVENUE' },
    { accountCode: '4600', accountName: 'Surgical Revenue', accountType: 'REVENUE' },
    { accountCode: '4700', accountName: 'Other Medical Revenue', accountType: 'REVENUE' },
    // Expenses
    { accountCode: '5000', accountName: 'Salaries and Wages', accountType: 'EXPENSE' },
    { accountCode: '5100', accountName: 'Medical Supplies Expense', accountType: 'EXPENSE' },
    { accountCode: '5200', accountName: 'Pharmacy Cost of Goods', accountType: 'EXPENSE' },
    { accountCode: '5300', accountName: 'Utilities Expense', accountType: 'EXPENSE' },
    { accountCode: '5400', accountName: 'Depreciation Expense', accountType: 'EXPENSE' },
    { accountCode: '5500', accountName: 'Repairs and Maintenance', accountType: 'EXPENSE' },
    { accountCode: '5600', accountName: 'Administrative Expense', accountType: 'EXPENSE' },
    { accountCode: '5700', accountName: 'Bad Debts Expense', accountType: 'EXPENSE' },
  ];

  for (const acct of accounts) {
    const existing = await prisma.chartOfAccounts.findUnique({ where: { accountCode: acct.accountCode } });
    if (!existing) {
      await prisma.chartOfAccounts.create({ data: acct });
    }
  }
  console.log('Created chart of accounts');

  // 10. Sample patients
  const patients = [
    {
      patientNo: 'PAT-000001',
      firstName: 'Juan',
      middleName: 'Dela',
      lastName: 'Cruz',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'MALE' as const,
      phone: '09171111111',
      address: '123 Rizal St.',
      city: 'Manila',
      province: 'Metro Manila',
    },
    {
      patientNo: 'PAT-000002',
      firstName: 'Maria',
      lastName: 'Reyes',
      dateOfBirth: new Date('1948-07-20'),
      gender: 'FEMALE' as const,
      isSenior: true,
      seniorIdNo: 'SC-2018-001',
      phone: '09282222222',
      philhealthNo: 'PH-12-345678901',
      address: '456 Bonifacio Ave.',
      city: 'Quezon City',
    },
    {
      patientNo: 'PAT-000003',
      firstName: 'Pedro',
      lastName: 'Santos',
      dateOfBirth: new Date('1990-12-01'),
      gender: 'MALE' as const,
      isPwd: true,
      pwdIdNo: 'PWD-2020-001',
      phone: '09393333333',
    },
  ];

  for (const patient of patients) {
    const existing = await prisma.patient.findUnique({ where: { patientNo: patient.patientNo } });
    if (!existing) {
      await prisma.patient.create({ data: patient });
    }
  }
  console.log('Created sample patients');

  // 11. SMS Templates
  const smsTemplates = [
    {
      name: 'appointment_reminder',
      template: 'Dear {patient_name}, this is a reminder for your appointment on {date} at {time} with Dr. {doctor_name}. Please call {phone} to reschedule.',
      category: 'appointment',
    },
    {
      name: 'lab_result_ready',
      template: 'Dear {patient_name}, your laboratory results are now available. Please visit our facility or call {phone} to inquire.',
      category: 'laboratory',
    },
    {
      name: 'bill_payment_reminder',
      template: 'Dear {patient_name}, your outstanding balance is PHP {amount}. Please settle your account at your earliest convenience. For inquiries: {phone}.',
      category: 'billing',
    },
    {
      name: 'admission_notification',
      template: 'Dear {patient_name}, you have been admitted to {hospital_name}. Room: {room_no}. For inquiries call: {phone}.',
      category: 'admission',
    },
  ];

  for (const template of smsTemplates) {
    const existing = await prisma.smsTemplate.findUnique({ where: { name: template.name } });
    if (!existing) {
      await prisma.smsTemplate.create({ data: template });
    }
  }
  console.log('Created SMS templates');

  // 12. More staff users
  const extraStaff = [
    { username: 'pharmacist1', email: 'pharmacist@pibs.ph', role: 'PHARMACIST' as const },
    { username: 'labtech1', email: 'labtech@pibs.ph', role: 'LAB_TECH' as const },
    { username: 'radtech1', email: 'radtech@pibs.ph', role: 'RADIOLOGY_TECH' as const },
    { username: 'nurse2', email: 'nurse2@pibs.ph', role: 'NURSE' as const },
    { username: 'admin2', email: 'admin2@pibs.ph', role: 'ADMIN' as const },
  ];
  for (const s of extraStaff) {
    const hash = await bcrypt.hash('pibs2024', 12);
    await prisma.user.upsert({ where: { username: s.username }, update: {}, create: { ...s, passwordHash: hash } });
  }
  console.log('Created extra staff users');

  // 13. Rooms (actual room instances)
  const roomTypeRecords = await prisma.roomType.findMany();
  const rtMap: Record<string, string> = {};
  for (const rt of roomTypeRecords) rtMap[rt.name] = rt.id;

  const rooms = [
    { roomNumber: '101', floor: '1', building: 'Main', roomTypeId: rtMap['Private Room'], isOccupied: false },
    { roomNumber: '102', floor: '1', building: 'Main', roomTypeId: rtMap['Private Room'], isOccupied: false },
    { roomNumber: '103', floor: '1', building: 'Main', roomTypeId: rtMap['Private Room'], isOccupied: false },
    { roomNumber: '201', floor: '2', building: 'Main', roomTypeId: rtMap['Semi-Private Room'], isOccupied: false },
    { roomNumber: '202', floor: '2', building: 'Main', roomTypeId: rtMap['Semi-Private Room'], isOccupied: false },
    { roomNumber: '203', floor: '2', building: 'Main', roomTypeId: rtMap['Semi-Private Room'], isOccupied: false },
    { roomNumber: 'W1A', floor: '1', building: 'Wing A', roomTypeId: rtMap['Ward'], isOccupied: false },
    { roomNumber: 'W1B', floor: '1', building: 'Wing A', roomTypeId: rtMap['Ward'], isOccupied: false },
    { roomNumber: 'ICU-1', floor: '3', building: 'Main', roomTypeId: rtMap['ICU'], isOccupied: false },
    { roomNumber: 'ICU-2', floor: '3', building: 'Main', roomTypeId: rtMap['ICU'], isOccupied: false },
    { roomNumber: 'NICU-1', floor: '3', building: 'Main', roomTypeId: rtMap['NICU'], isOccupied: false },
    { roomNumber: 'OR-1', floor: '4', building: 'Main', roomTypeId: rtMap['OR Suite'], isOccupied: false },
    { roomNumber: 'OR-2', floor: '4', building: 'Main', roomTypeId: rtMap['OR Suite'], isOccupied: false },
  ];
  for (const room of rooms) {
    if (!room.roomTypeId) continue;
    const existing = await prisma.room.findUnique({ where: { roomNumber: room.roomNumber } });
    if (!existing) await prisma.room.create({ data: room });
  }
  console.log('Created rooms');

  // 14. More sample patients (10 additional)
  const morePatients = [
    { patientNo: 'PAT-000004', firstName: 'Luisa', lastName: 'Mendoza', dateOfBirth: new Date('1972-05-10'), gender: 'FEMALE' as const, phone: '09174444444', city: 'Pasig', philhealthNo: 'PH-22-111222333' },
    { patientNo: 'PAT-000005', firstName: 'Roberto', lastName: 'Villanueva', dateOfBirth: new Date('1965-09-25'), gender: 'MALE' as const, phone: '09285555555', isSenior: false, city: 'Makati' },
    { patientNo: 'PAT-000006', firstName: 'Celine', lastName: 'Aguilar', dateOfBirth: new Date('1998-01-30'), gender: 'FEMALE' as const, phone: '09396666666', city: 'Mandaluyong' },
    { patientNo: 'PAT-000007', firstName: 'Danilo', lastName: 'Bautista', dateOfBirth: new Date('1955-11-08'), gender: 'MALE' as const, phone: '09177777777', isSenior: true, seniorIdNo: 'SC-2015-004', city: 'Marikina' },
    { patientNo: 'PAT-000008', firstName: 'Elena', lastName: 'Castillo', dateOfBirth: new Date('1989-07-14'), gender: 'FEMALE' as const, phone: '09288888888', city: 'Taguig' },
    { patientNo: 'PAT-000009', firstName: 'Fernando', lastName: 'Dela Torre', dateOfBirth: new Date('1945-03-22'), gender: 'MALE' as const, phone: '09399999999', isSenior: true, seniorIdNo: 'SC-2010-005', philhealthNo: 'PH-33-444555666', city: 'Caloocan' },
    { patientNo: 'PAT-000010', firstName: 'Gloria', lastName: 'Espiritu', dateOfBirth: new Date('2005-08-18'), gender: 'FEMALE' as const, phone: '09170000001', city: 'Las Pinas' },
    { patientNo: 'PAT-000011', firstName: 'Hector', lastName: 'Flores', dateOfBirth: new Date('1978-12-05'), gender: 'MALE' as const, phone: '09281111112', isPwd: true, pwdIdNo: 'PWD-2019-002', city: 'Paranaque' },
    { patientNo: 'PAT-000012', firstName: 'Irene', lastName: 'Garcia', dateOfBirth: new Date('1992-04-27'), gender: 'FEMALE' as const, phone: '09392222223', city: 'Valenzuela' },
    { patientNo: 'PAT-000013', firstName: 'Jose', lastName: 'Hernandez', dateOfBirth: new Date('1960-06-15'), gender: 'MALE' as const, phone: '09173333334', city: 'Malabon' },
  ];
  for (const p of morePatients) {
    const existing = await prisma.patient.findUnique({ where: { patientNo: p.patientNo } });
    if (!existing) await prisma.patient.create({ data: p });
  }
  console.log('Created additional patients');

  // 15. Sample medications + inventory
  const medications = [
    { genericName: 'Amoxicillin', brandName: 'Amoxil', dosageForm: 'Capsule', strength: '500mg', stock: 500, minStock: 100, unitCost: 5.5, price: 12.0, unit: 'capsule' },
    { genericName: 'Paracetamol', brandName: 'Biogesic', dosageForm: 'Tablet', strength: '500mg', stock: 1000, minStock: 200, unitCost: 1.5, price: 4.0, unit: 'tablet' },
    { genericName: 'Amlodipine', brandName: 'Norvasc', dosageForm: 'Tablet', strength: '5mg', stock: 300, minStock: 100, unitCost: 8.0, price: 18.0, unit: 'tablet' },
    { genericName: 'Metformin', brandName: 'Glucophage', dosageForm: 'Tablet', strength: '500mg', stock: 400, minStock: 100, unitCost: 5.0, price: 12.0, unit: 'tablet' },
    { genericName: 'Losartan', brandName: 'Cozaar', dosageForm: 'Tablet', strength: '50mg', stock: 250, minStock: 80, unitCost: 9.0, price: 22.0, unit: 'tablet' },
    { genericName: 'Salbutamol', brandName: 'Ventolin', dosageForm: 'Inhaler', strength: '100mcg/dose', stock: 50, minStock: 20, unitCost: 120.0, price: 280.0, unit: 'inhaler' },
    { genericName: 'Omeprazole', brandName: 'Losec', dosageForm: 'Capsule', strength: '20mg', stock: 350, minStock: 100, unitCost: 10.0, price: 25.0, unit: 'capsule' },
    { genericName: 'Atorvastatin', brandName: 'Lipitor', dosageForm: 'Tablet', strength: '20mg', stock: 200, minStock: 80, unitCost: 12.0, price: 30.0, unit: 'tablet' },
    { genericName: 'Cefuroxime', brandName: 'Zinnat', dosageForm: 'Tablet', strength: '250mg', stock: 150, minStock: 50, unitCost: 20.0, price: 48.0, unit: 'tablet' },
    { genericName: 'Ibuprofen', brandName: 'Advil', dosageForm: 'Tablet', strength: '400mg', stock: 600, minStock: 150, unitCost: 3.5, price: 8.0, unit: 'tablet' },
    { genericName: 'Insulin Glargine', brandName: 'Lantus', dosageForm: 'Injection', strength: '100 IU/mL', stock: 30, minStock: 10, unitCost: 850.0, price: 1800.0, unit: 'vial' },
    { genericName: 'IV Fluid NaCl 0.9%', brandName: 'Baxter', dosageForm: 'IV Solution', strength: '0.9%', stock: 200, minStock: 50, unitCost: 45.0, price: 95.0, unit: 'bag (1L)' },
  ];
  let medIdx = 0;
  for (const med of medications) {
    const existing = await prisma.medication.findFirst({ where: { genericName: med.genericName, strength: med.strength } });
    if (!existing) {
      const created = await prisma.medication.create({
        data: { genericName: med.genericName, brandName: med.brandName, dosageForm: med.dosageForm, strength: med.strength },
      });
      await prisma.inventoryItem.create({
        data: {
          medicationId: created.id,
          itemName: `${med.genericName} ${med.strength}`,
          itemCode: `MED-${String(++medIdx).padStart(4, '0')}`,
          unit: med.unit,
          currentStock: med.stock,
          minimumStock: med.minStock,
          unitCost: med.unitCost,
          sellingPrice: med.price,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          batchNo: `BATCH-${Date.now().toString().slice(-6)}`,
          location: 'Main Pharmacy',
        },
      });
    } else { medIdx++; }
  }
  console.log('Created medications and inventory');

  // 16. Dialysis machines
  const dialysisMachines = [
    { machineCode: 'DM-001', model: 'Fresenius 5008S', status: 'AVAILABLE' },
    { machineCode: 'DM-002', model: 'Fresenius 5008S', status: 'AVAILABLE' },
    { machineCode: 'DM-003', model: 'Nipro NCV-12', status: 'AVAILABLE' },
    { machineCode: 'DM-004', model: 'Nipro NCV-12', status: 'AVAILABLE' },
  ];
  for (const m of dialysisMachines) {
    const existing = await prisma.dialysisMachine.findFirst({ where: { machineCode: m.machineCode } });
    if (!existing) await prisma.dialysisMachine.create({ data: m });
  }
  console.log('Created dialysis machines');

  console.log('\nSeed completed successfully!');
  console.log('Default login: admin / admin123');
  console.log('Staff logins: billing1, nurse1, nurse2, pharmacist1, labtech1 / pibs2024');
  console.log('Doctor logins: dr.santos, dr.reyes, dr.cruz / doctor123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
