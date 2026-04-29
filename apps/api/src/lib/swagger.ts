import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// ── OpenAPI 3.0 Specification ─────────────────────────────────────────────────
const spec = {
  openapi: '3.0.3',
  info: {
    title: 'iHIMS API',
    version: '1.0.0',
    description: `
**intelligent Hospital Information System (iHIMS)** — REST API reference.

All authenticated endpoints require a \`Bearer\` token obtained from \`POST /api/auth/login\`.

**Base URL:** \`http://localhost:3001/api\`

**Auth flow:**
1. \`POST /api/auth/login\` → receive \`token\`
2. Add header: \`Authorization: Bearer <token>\`
    `,
    contact: { name: 'iHIMS Dev Team' },
    license: { name: 'Proprietary' },
  },
  servers: [
    { url: 'http://localhost:3001/api', description: 'Local development' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT issued by POST /auth/login',
      },
    },
    schemas: {
      // ── Generic ─────────────────────────────────────────────────────────────
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Success' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
        },
      },
      PaginatedMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      // ── Auth ─────────────────────────────────────────────────────────────────
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', format: 'password', example: 'admin123' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'BILLING', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGY_TECH'] },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
        },
      },
      // ── Patient ───────────────────────────────────────────────────────────────
      Patient: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          patientNo: { type: 'string', example: 'P-2024-00001' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
          contactNumber: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          bloodType: { type: 'string', enum: ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'] },
          philhealthNo: { type: 'string' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PatientCreate: {
        type: 'object',
        required: ['firstName', 'lastName', 'dateOfBirth', 'gender'],
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
          contactNumber: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          bloodType: { type: 'string' },
          philhealthNo: { type: 'string' },
          hmoCompanyId: { type: 'string' },
        },
      },
      // ── Billing ───────────────────────────────────────────────────────────────
      Bill: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          billNo: { type: 'string', example: 'BILL-2024-00001' },
          patientId: { type: 'string' },
          totalAmount: { type: 'number' },
          paidAmount: { type: 'number' },
          balance: { type: 'number' },
          status: { type: 'string', enum: ['DRAFT', 'PENDING', 'PARTIAL', 'PAID', 'CANCELLED', 'WRITTEN_OFF'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Consultation ──────────────────────────────────────────────────────────
      Consultation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          patientId: { type: 'string' },
          doctorId: { type: 'string' },
          chiefComplaint: { type: 'string' },
          diagnosis: { type: 'string' },
          icdCodes: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          scheduledAt: { type: 'string', format: 'date-time' },
        },
      },
      // ── Appointment ───────────────────────────────────────────────────────────
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          patientId: { type: 'string' },
          doctorId: { type: 'string' },
          scheduledAt: { type: 'string', format: 'date-time' },
          purpose: { type: 'string' },
          status: { type: 'string', enum: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
        },
      },
      // ── Queue ─────────────────────────────────────────────────────────────────
      QueueEntry: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          queueNo: { type: 'integer' },
          patientId: { type: 'string' },
          status: { type: 'string', enum: ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] },
          priority: { type: 'string', enum: ['NORMAL', 'URGENT', 'EMERGENCY'] },
          calledAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      // ── AI ────────────────────────────────────────────────────────────────────
      DiagnoseSuggestion: {
        type: 'object',
        properties: {
          icdCode: { type: 'string', example: 'A90' },
          diagnosis: { type: 'string', example: 'Dengue Fever' },
          probability: { type: 'number', example: 0.75 },
          reasoning: { type: 'string' },
        },
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', default: 1 },
        description: 'Page number (1-based)',
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 20 },
        description: 'Items per page',
      },
      SearchParam: {
        name: 'q',
        in: 'query',
        schema: { type: 'string' },
        description: 'Search query',
      },
      IdParam: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Resource UUID',
      },
    },
  },
  security: [{ BearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication and user session management' },
    { name: 'Patients', description: 'Patient registration and management' },
    { name: 'Consultations', description: 'Doctor consultations and prescriptions' },
    { name: 'EMR', description: 'Electronic Medical Records — vitals, history' },
    { name: 'Lab', description: 'Laboratory requisitions and results' },
    { name: 'Radiology', description: 'Radiology orders and reports' },
    { name: 'Pharmacy', description: 'Pharmacy inventory and dispensing' },
    { name: 'Billing', description: 'Bills, payments, and financial management' },
    { name: 'Queue', description: 'Real-time queue management' },
    { name: 'Appointments', description: 'Appointment scheduling' },
    { name: 'Admissions', description: 'Room and admission management' },
    { name: 'Nursing', description: 'Nursing care plans, vitals, shift handover' },
    { name: 'HMO', description: 'HMO registrations, eligibility, and claims' },
    { name: 'PhilHealth', description: 'PhilHealth CF4 claims and eClaims API' },
    { name: 'Accounting', description: 'Chart of accounts, GL entries, financial statements' },
    { name: 'Analytics', description: 'Revenue analytics and performance metrics' },
    { name: 'Telemedicine', description: 'Virtual consultations and WebRTC sessions' },
    { name: 'AI', description: 'AI clinical decision support' },
    { name: 'Operating Room', description: 'OR scheduling and WHO safety checklist' },
    { name: 'Blood Bank', description: 'Blood unit inventory and cross-matching' },
    { name: 'Dialysis', description: 'Dialysis session and machine management' },
    { name: 'Assets', description: 'Asset tracking and depreciation' },
    { name: 'DOH', description: 'DOH FHSIS and PIDSR reporting' },
    { name: 'HIE', description: 'Health Information Exchange and FHIR R4' },
    { name: 'Barcode', description: 'Barcode and RFID scanning' },
    { name: 'SMS', description: 'SMS template management and Semaphore integration' },
    { name: 'Payments', description: 'Online payments via PayMongo' },
    { name: 'Departments', description: 'Hospital departments' },
    { name: 'Doctors', description: 'Doctor profiles and schedules' },
    { name: 'Services', description: 'Hospital service catalog' },
    { name: 'Users', description: 'User management and RBAC' },
    { name: 'Audit', description: 'Audit log' },
    { name: 'Settings', description: 'System configuration and branding' },
    { name: 'Patient Portal', description: 'Patient-facing endpoints' },
  ],
  paths: {
    // ── HEALTH ───────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Auth'],
        summary: 'Health check',
        security: [],
        responses: {
          200: { description: 'API is running', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' }, timestamp: { type: 'string' } } } } } },
        },
      },
    },

    // ── AUTH ─────────────────────────────────────────────────────────────────
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Authenticate with username/password. Rate limited to 10 requests per 15 minutes.',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/LoginResponse' } } }] } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          429: { description: 'Too many login attempts', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Invalidates the current session token.',
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Returns the authenticated user\'s profile.',
        responses: {
          200: { description: 'Current user data', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
        },
      },
    },
    '/auth/profile': {
      put: {
        tags: ['Auth'],
        summary: 'Update profile',
        description: 'Update own profile (name, email, etc.).',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string' } } } } } },
        responses: { 200: { description: 'Profile updated' } },
      },
    },
    '/auth/change-password': {
      put: {
        tags: ['Auth'],
        summary: 'Change password',
        description: 'Change own password. Rate limited to 5 requests per 15 minutes.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 6 } } } } } },
        responses: { 200: { description: 'Password changed' }, 400: { description: 'Wrong current password' }, 429: { description: 'Too many attempts' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset',
        description: 'Sends a password reset link to the user\'s email. Rate limited to 3 per hour.',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
        responses: { 200: { description: 'Reset email sent (always returns 200 to prevent enumeration)' }, 429: { description: 'Too many requests' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'newPassword'], properties: { token: { type: 'string' }, newPassword: { type: 'string', minLength: 6 } } } } } },
        responses: { 200: { description: 'Password reset successful' }, 400: { description: 'Invalid or expired token' }, 429: { description: 'Too many attempts' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new staff user',
        description: 'Admin/Super Admin only. Creates a new staff account.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username', 'password', 'role'], properties: { username: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, role: { type: 'string', enum: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'BILLING', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGY_TECH'] } } } } } },
        responses: { 201: { description: 'User created' }, 403: { description: 'Insufficient permissions' } },
      },
    },

    // ── PATIENTS ──────────────────────────────────────────────────────────────
    '/patients': {
      get: {
        tags: ['Patients'],
        summary: 'List patients',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/SearchParam' },
        ],
        responses: { 200: { description: 'Paginated patient list', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { $ref: '#/components/schemas/PaginatedMeta' }] } } } } },
      },
      post: {
        tags: ['Patients'],
        summary: 'Register new patient',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PatientCreate' } } } },
        responses: { 201: { description: 'Patient created', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/Patient' } } }] } } } } },
      },
    },
    '/patients/{id}': {
      get: {
        tags: ['Patients'],
        summary: 'Get patient by ID',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Patient data' }, 404: { description: 'Not found' } },
      },
      put: {
        tags: ['Patients'],
        summary: 'Update patient',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PatientCreate' } } } },
        responses: { 200: { description: 'Updated' }, 404: { description: 'Not found' } },
      },
      delete: {
        tags: ['Patients'],
        summary: 'Soft-delete patient',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/patients/search': {
      get: {
        tags: ['Patients'],
        summary: 'Search patients',
        parameters: [{ $ref: '#/components/parameters/SearchParam' }],
        responses: { 200: { description: 'Matching patients' } },
      },
    },
    '/patients/import': {
      post: {
        tags: ['Patients'],
        summary: 'Bulk import patients from Excel',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: { 200: { description: 'Import summary with success/error counts' } },
      },
    },

    // ── CONSULTATIONS ─────────────────────────────────────────────────────────
    '/consultations': {
      get: {
        tags: ['Consultations'],
        summary: 'List consultations',
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'patientId', in: 'query', schema: { type: 'string' } }, { name: 'doctorId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Consultations list' } },
      },
      post: {
        tags: ['Consultations'],
        summary: 'Create consultation',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId', 'doctorId', 'scheduledAt'], properties: { patientId: { type: 'string' }, doctorId: { type: 'string' }, scheduledAt: { type: 'string', format: 'date-time' }, chiefComplaint: { type: 'string' }, icdCodes: { type: 'array', items: { type: 'string' } } } } } } },
        responses: { 201: { description: 'Consultation created' } },
      },
    },
    '/consultations/{id}': {
      get: { tags: ['Consultations'], summary: 'Get consultation', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Consultation detail' } } },
      put: { tags: ['Consultations'], summary: 'Update consultation', parameters: [{ $ref: '#/components/parameters/IdParam' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Consultation' } } } }, responses: { 200: { description: 'Updated' } } },
    },

    // ── EMR ───────────────────────────────────────────────────────────────────
    '/emr/patients/{patientId}': {
      get: {
        tags: ['EMR'],
        summary: 'Get full EMR for a patient',
        parameters: [{ name: 'patientId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Patient EMR including vitals, consultations, labs, allergies' } },
      },
    },
    '/emr/vitals': {
      post: {
        tags: ['EMR'],
        summary: 'Record vital signs',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId'], properties: { patientId: { type: 'string' }, temperature: { type: 'number' }, bloodPressureSystolic: { type: 'integer' }, bloodPressureDiastolic: { type: 'integer' }, heartRate: { type: 'integer' }, respiratoryRate: { type: 'integer' }, oxygenSaturation: { type: 'number' }, weight: { type: 'number' }, height: { type: 'number' } } } } } },
        responses: { 201: { description: 'Vitals recorded' } },
      },
    },

    // ── LAB ───────────────────────────────────────────────────────────────────
    '/lab/requisitions': {
      get: { tags: ['Lab'], summary: 'List lab requisitions', parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Requisitions list' } } },
      post: { tags: ['Lab'], summary: 'Create lab requisition', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId', 'tests'], properties: { patientId: { type: 'string' }, doctorId: { type: 'string' }, tests: { type: 'array', items: { type: 'string' } }, urgency: { type: 'string', enum: ['ROUTINE', 'URGENT', 'STAT'] } } } } } }, responses: { 201: { description: 'Requisition created' } } },
    },
    '/lab/requisitions/{id}': {
      get: { tags: ['Lab'], summary: 'Get requisition', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Requisition detail' } } },
    },
    '/lab/results': {
      post: { tags: ['Lab'], summary: 'Enter lab results', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['requisitionId', 'results'], properties: { requisitionId: { type: 'string' }, results: { type: 'array', items: { type: 'object', properties: { testName: { type: 'string' }, value: { type: 'string' }, unit: { type: 'string' }, normalRange: { type: 'string' }, isAbnormal: { type: 'boolean' } } } } } } } } }, responses: { 200: { description: 'Results saved' } } },
    },
    '/lab/templates': {
      get: { tags: ['Lab'], summary: 'Get all lab test templates (26 templates)', responses: { 200: { description: 'Test template list' } } },
    },

    // ── PHARMACY ──────────────────────────────────────────────────────────────
    '/medications': {
      get: { tags: ['Pharmacy'], summary: 'List medications', parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { $ref: '#/components/parameters/SearchParam' }], responses: { 200: { description: 'Medication list' } } },
      post: { tags: ['Pharmacy'], summary: 'Add medication', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['itemName', 'category'], properties: { itemName: { type: 'string' }, genericName: { type: 'string' }, brandName: { type: 'string' }, dosageForm: { type: 'string' }, strength: { type: 'string' }, unit: { type: 'string' }, quantity: { type: 'integer' }, reorderLevel: { type: 'integer' }, unitCost: { type: 'number' } } } } } }, responses: { 201: { description: 'Medication added' } } },
    },
    '/pharmacy/dispense': {
      post: { tags: ['Pharmacy'], summary: 'Dispense medication', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['prescriptionId'], properties: { prescriptionId: { type: 'string' }, dispensedItems: { type: 'array', items: { type: 'object' } } } } } } }, responses: { 200: { description: 'Dispensed successfully' } } },
    },

    // ── BILLING ───────────────────────────────────────────────────────────────
    '/billing': {
      get: { tags: ['Billing'], summary: 'List bills', parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'PENDING', 'PARTIAL', 'PAID', 'CANCELLED'] } }, { name: 'patientId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Bills list' } } },
      post: { tags: ['Billing'], summary: 'Create bill', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId'], properties: { patientId: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { description: { type: 'string' }, quantity: { type: 'integer' }, unitPrice: { type: 'number' } } } } } } } } }, responses: { 201: { description: 'Bill created', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/Bill' } } }] } } } } },
      },
    },
    '/billing/{id}': {
      get: { tags: ['Billing'], summary: 'Get bill', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Bill detail with items and payments' } } },
    },
    '/billing/{id}/payment': {
      post: { tags: ['Billing'], summary: 'Record payment', parameters: [{ $ref: '#/components/parameters/IdParam' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount', 'paymentMethod'], properties: { amount: { type: 'number' }, paymentMethod: { type: 'string', enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'HMO', 'PHILHEALTH', 'GCASH', 'MAYA'] }, referenceNo: { type: 'string' } } } } } }, responses: { 200: { description: 'Payment recorded' } } },
    },
    '/billing/{id}/pdf': {
      get: { tags: ['Billing'], summary: 'Download bill as PDF', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'PDF data URL for rendering' } } },
    },

    // ── QUEUE ─────────────────────────────────────────────────────────────────
    '/queue': {
      get: { tags: ['Queue'], summary: 'Get today\'s queue', responses: { 200: { description: 'Queue with entries' } } },
    },
    '/queue/entries': {
      post: { tags: ['Queue'], summary: 'Add patient to queue', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId', 'queueId'], properties: { patientId: { type: 'string' }, queueId: { type: 'string' }, priority: { type: 'string', enum: ['NORMAL', 'URGENT', 'EMERGENCY'] } } } } } }, responses: { 201: { description: 'Added to queue; Socket.io emits queue:update' } } },
    },
    '/queue/entries/{id}/call': {
      put: { tags: ['Queue'], summary: 'Call patient from queue', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Patient called; Socket.io emits queue:update' } } },
    },
    '/queue/entries/{id}/complete': {
      put: { tags: ['Queue'], summary: 'Mark queue entry complete', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Completed' } } },
    },

    // ── APPOINTMENTS ──────────────────────────────────────────────────────────
    '/appointments': {
      get: { tags: ['Appointments'], summary: 'List appointments', parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'doctorId', in: 'query', schema: { type: 'string' } }, { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Appointments list' } } },
      post: { tags: ['Appointments'], summary: 'Book appointment', description: 'Sends confirmation email to patient.', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } }, responses: { 201: { description: 'Appointment booked' } } },
    },
    '/appointments/{id}': {
      get: { tags: ['Appointments'], summary: 'Get appointment', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Appointment detail' } } },
      put: { tags: ['Appointments'], summary: 'Update appointment', parameters: [{ $ref: '#/components/parameters/IdParam' }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Appointment' } } } }, responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Appointments'], summary: 'Cancel appointment', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Cancelled' } } },
    },

    // ── ADMISSIONS ────────────────────────────────────────────────────────────
    '/admissions': {
      get: { tags: ['Admissions'], summary: 'List admissions', parameters: [{ $ref: '#/components/parameters/PageParam' }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['ADMITTED', 'DISCHARGED', 'TRANSFERRED'] } }], responses: { 200: { description: 'Admissions list' } } },
      post: { tags: ['Admissions'], summary: 'Admit patient', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId', 'roomId', 'admittingDoctorId'], properties: { patientId: { type: 'string' }, roomId: { type: 'string' }, admittingDoctorId: { type: 'string' }, admissionType: { type: 'string' }, chiefComplaint: { type: 'string' } } } } } }, responses: { 201: { description: 'Patient admitted' } } },
    },
    '/admissions/{id}/discharge': {
      put: { tags: ['Admissions'], summary: 'Discharge patient', parameters: [{ $ref: '#/components/parameters/IdParam' }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { dischargeNotes: { type: 'string' }, dischargeCondition: { type: 'string' } } } } } }, responses: { 200: { description: 'Discharged' } } },
    },
    '/rooms': {
      get: { tags: ['Admissions'], summary: 'List rooms', parameters: [{ name: 'available', in: 'query', schema: { type: 'boolean' } }], responses: { 200: { description: 'Rooms list' } } },
    },

    // ── NURSING ───────────────────────────────────────────────────────────────
    '/nursing/care-plans': {
      get: { tags: ['Nursing'], summary: 'List care plans', parameters: [{ name: 'patientId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Care plans' } } },
      post: { tags: ['Nursing'], summary: 'Create care plan', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId', 'nursingDiagnosis'], properties: { patientId: { type: 'string' }, nursingDiagnosis: { type: 'string' }, goals: { type: 'array', items: { type: 'string' } }, interventions: { type: 'array', items: { type: 'string' } } } } } } }, responses: { 201: { description: 'Care plan created' } } },
    },
    '/nursing/shift-handover': {
      post: { tags: ['Nursing'], summary: 'Submit shift handover', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['shiftType', 'summary'], properties: { shiftType: { type: 'string', enum: ['DAY', 'AFTERNOON', 'NIGHT'] }, summary: { type: 'string' }, patients: { type: 'array', items: { type: 'object' } } } } } } }, responses: { 201: { description: 'Handover submitted' } } },
    },

    // ── HMO ───────────────────────────────────────────────────────────────────
    '/hmo/registrations': {
      get: { tags: ['HMO'], summary: 'List HMO registrations', responses: { 200: { description: 'HMO registrations' } } },
      post: { tags: ['HMO'], summary: 'Register patient with HMO', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId', 'hmoCompanyId', 'membershipNo'], properties: { patientId: { type: 'string' }, hmoCompanyId: { type: 'string' }, membershipNo: { type: 'string' }, cardValidFrom: { type: 'string', format: 'date' }, cardValidTo: { type: 'string', format: 'date' } } } } } }, responses: { 201: { description: 'Registered' } } },
    },
    '/hmo/eligibility': {
      post: { tags: ['HMO'], summary: 'Check HMO eligibility', description: 'Checks eligibility via real HMO API if configured, else simulation.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId', 'hmoCompanyId'], properties: { patientId: { type: 'string' }, hmoCompanyId: { type: 'string' }, serviceType: { type: 'string' } } } } } }, responses: { 200: { description: 'Eligibility result with isSimulated flag' } } },
    },
    '/hmo/claims': {
      get: { tags: ['HMO'], summary: 'List HMO claims', responses: { 200: { description: 'HMO claims' } } },
      post: { tags: ['HMO'], summary: 'Submit HMO claim', responses: { 201: { description: 'Claim submitted' } } },
    },
    '/hmo/config': {
      get: { tags: ['HMO'], summary: 'Get HMO API config', security: [], description: 'Returns which HMOs have real API configured vs simulation.', responses: { 200: { description: 'HMO API status per provider' } } },
    },

    // ── PHILHEALTH ────────────────────────────────────────────────────────────
    '/philhealth/claims': {
      get: { tags: ['PhilHealth'], summary: 'List PhilHealth claims', responses: { 200: { description: 'Claims list' } } },
      post: { tags: ['PhilHealth'], summary: 'Create PhilHealth claim', responses: { 201: { description: 'Claim created' } } },
    },
    '/philhealth/eligibility': {
      post: { tags: ['PhilHealth'], summary: 'Verify PhilHealth eligibility', description: 'Real eClaims API call if credentials configured, else simulation.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['philhealthNo'], properties: { philhealthNo: { type: 'string' }, patientId: { type: 'string' } } } } } }, responses: { 200: { description: 'Eligibility result with isSimulated flag' } } },
    },
    '/philhealth/config': {
      get: { tags: ['PhilHealth'], summary: 'Get PhilHealth API config', security: [], responses: { 200: { description: 'Whether real eClaims API is configured' } } },
    },

    // ── ACCOUNTING ────────────────────────────────────────────────────────────
    '/accounting/coa': {
      get: { tags: ['Accounting'], summary: 'Get Chart of Accounts', responses: { 200: { description: 'COA tree' } } },
      post: { tags: ['Accounting'], summary: 'Add account', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['accountCode', 'accountName', 'accountType'], properties: { accountCode: { type: 'string' }, accountName: { type: 'string' }, accountType: { type: 'string', enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] }, parentId: { type: 'string' } } } } } }, responses: { 201: { description: 'Account created' } } },
    },
    '/accounting/journal': {
      post: { tags: ['Accounting'], summary: 'Post journal entry', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['description', 'lines'], properties: { description: { type: 'string' }, lines: { type: 'array', items: { type: 'object', required: ['accountId', 'debit', 'credit'], properties: { accountId: { type: 'string' }, debit: { type: 'number' }, credit: { type: 'number' } } } } } } } } }, responses: { 201: { description: 'Journal entry posted' } } },
    },
    '/accounting/reports/trial-balance': {
      get: { tags: ['Accounting'], summary: 'Trial balance', parameters: [{ name: 'asOf', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Trial balance data' } } },
    },
    '/accounting/reports/income-statement': {
      get: { tags: ['Accounting'], summary: 'Income statement', parameters: [{ name: 'from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'P&L data' } } },
    },
    '/accounting/reports/balance-sheet': {
      get: { tags: ['Accounting'], summary: 'Balance sheet', responses: { 200: { description: 'Balance sheet data' } } },
    },

    // ── ANALYTICS ─────────────────────────────────────────────────────────────
    '/analytics/revenue': {
      get: { tags: ['Analytics'], summary: 'Revenue analytics', parameters: [{ name: 'period', in: 'query', schema: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] } }], responses: { 200: { description: 'Revenue data by period' } } },
    },
    '/analytics/patients': {
      get: { tags: ['Analytics'], summary: 'Patient metrics', responses: { 200: { description: 'Patient count, demographics, trends' } } },
    },
    '/analytics/doctors': {
      get: { tags: ['Analytics'], summary: 'Doctor performance', responses: { 200: { description: 'Consultations per doctor, revenue, patient load' } } },
    },

    // ── TELEMEDICINE ──────────────────────────────────────────────────────────
    '/telemedicine/sessions': {
      get: { tags: ['Telemedicine'], summary: 'List telemedicine sessions', responses: { 200: { description: 'Sessions list' } } },
      post: { tags: ['Telemedicine'], summary: 'Book telemedicine session', description: 'Creates a room code; sends booking confirmation email to patient.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId', 'doctorId', 'scheduledAt'], properties: { patientId: { type: 'string' }, doctorId: { type: 'string' }, scheduledAt: { type: 'string', format: 'date-time' } } } } } }, responses: { 201: { description: 'Session created with roomCode and joinUrl' } } },
    },
    '/telemedicine/sessions/{id}': {
      get: { tags: ['Telemedicine'], summary: 'Get session details', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Session with roomCode for WebRTC join' } } },
    },

    // ── AI ────────────────────────────────────────────────────────────────────
    '/ai/config': {
      get: { tags: ['AI'], summary: 'AI engine status', security: [], description: 'Returns whether Claude API is configured (LLM mode) or rule-based.', responses: { 200: { description: 'AI config', content: { 'application/json': { schema: { type: 'object', properties: { aiEnabled: { type: 'boolean' }, model: { type: 'string' } } } } } } },
      },
    },
    '/ai/diagnose': {
      post: { tags: ['AI'], summary: 'Symptom-to-diagnosis', description: 'LLM diagnosis if Claude configured, else 30-rule engine. Returns aiEngine field.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['symptoms'], properties: { symptoms: { type: 'array', items: { type: 'string' }, example: ['fever', 'headache', 'rash'] }, age: { type: 'integer', example: 30 }, gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] } } } } } }, responses: { 200: { description: 'Differential diagnoses with ICD codes and probabilities', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { type: 'object', properties: { suggestions: { type: 'array', items: { $ref: '#/components/schemas/DiagnoseSuggestion' } }, aiEngine: { type: 'string', enum: ['llm', 'rule-based'] }, disclaimer: { type: 'string' } } } } }] } } } } },
      },
    },
    '/ai/check-interactions': {
      post: { tags: ['AI'], summary: 'Drug interaction check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['drugIds'], properties: { drugIds: { type: 'array', items: { type: 'string' }, minItems: 2 } } } } } }, responses: { 200: { description: 'Interaction results with severity (MINOR/MODERATE/MAJOR/CONTRAINDICATED)' } } },
    },
    '/ai/predict-readmission-risk': {
      post: { tags: ['AI'], summary: 'Readmission risk prediction', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId'], properties: { patientId: { type: 'string' } } } } } }, responses: { 200: { description: 'Risk level (LOW/MEDIUM/HIGH), score, risk factors, recommendations' } } },
    },
    '/ai/check-allergies': {
      post: { tags: ['AI'], summary: 'Allergy and contraindication check', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId', 'medicationId'], properties: { patientId: { type: 'string' }, medicationId: { type: 'string' } } } } } }, responses: { 200: { description: 'Safe flag and warnings array with severity' } } },
    },
    '/ai/vital-signs-analysis': {
      post: { tags: ['AI'], summary: 'Vital signs analysis', description: 'Analyzes latest vitals. Adds LLM clinical narrative if Claude configured.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId'], properties: { patientId: { type: 'string' } } } } } }, responses: { 200: { description: 'Alerts with status, clinicalSummary (LLM), priorityActions (LLM), urgencyLevel (LLM)' } } },
    },

    // ── SETTINGS ──────────────────────────────────────────────────────────────
    '/settings': {
      get: { tags: ['Settings'], summary: 'Get system settings', description: 'Returns branding config (name, logo, colors). Used by frontend on load.', responses: { 200: { description: 'System settings' } } },
      put: { tags: ['Settings'], summary: 'Update system settings', description: 'Admin/Super Admin only. Broadcasts update to all connected clients via Socket.io.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { systemName: { type: 'string' }, systemSubtitle: { type: 'string' }, primaryColor: { type: 'string' }, sidebarColor: { type: 'string' } } } } } }, responses: { 200: { description: 'Settings updated and broadcast to all clients' } } },
    },
    '/settings/logo': {
      post: { tags: ['Settings'], summary: 'Upload logo', requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { logo: { type: 'string', format: 'binary' } } } } } }, responses: { 200: { description: 'Logo URL returned' } } },
    },

    // ── AUDIT ─────────────────────────────────────────────────────────────────
    '/audit': {
      get: { tags: ['Audit'], summary: 'Get audit log', parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'userId', in: 'query', schema: { type: 'string' } }, { name: 'action', in: 'query', schema: { type: 'string' } }, { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Audit entries' } } },
    },

    // ── USERS ─────────────────────────────────────────────────────────────────
    '/users': {
      get: { tags: ['Users'], summary: 'List users', description: 'Admin/Super Admin only.', responses: { 200: { description: 'Users list' } } },
      post: { tags: ['Users'], summary: 'Create user', description: 'Same as /auth/register but via Users module.', responses: { 201: { description: 'User created' } } },
    },
    '/users/{id}': {
      put: { tags: ['Users'], summary: 'Update user', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Users'], summary: 'Deactivate user', parameters: [{ $ref: '#/components/parameters/IdParam' }], responses: { 200: { description: 'Deactivated' } } },
    },

    // ── PATIENT PORTAL ────────────────────────────────────────────────────────
    '/patient-portal/login': {
      post: { tags: ['Patient Portal'], summary: 'Patient portal login', security: [], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientNo', 'dateOfBirth'], properties: { patientNo: { type: 'string' }, dateOfBirth: { type: 'string', format: 'date' } } } } } }, responses: { 200: { description: 'Patient token' }, 401: { description: 'Not found or DOB mismatch' } } },
    },
    '/patient-portal/profile': {
      get: { tags: ['Patient Portal'], summary: 'Get patient profile (portal)', responses: { 200: { description: 'Patient demographics and HMO' } } },
    },
    '/patient-portal/appointments': {
      get: { tags: ['Patient Portal'], summary: 'My appointments (portal)', responses: { 200: { description: 'Patient\'s appointments' } } },
    },
    '/patient-portal/bills': {
      get: { tags: ['Patient Portal'], summary: 'My bills (portal)', responses: { 200: { description: 'Patient\'s bills with payment status' } } },
    },
    '/patient-portal/records': {
      get: { tags: ['Patient Portal'], summary: 'My medical records (portal)', responses: { 200: { description: 'Consultations, vitals, lab results, prescriptions' } } },
    },

    // ── SMS ───────────────────────────────────────────────────────────────────
    '/sms/templates': {
      get: { tags: ['SMS'], summary: 'List SMS templates', responses: { 200: { description: 'Templates list' } } },
      post: { tags: ['SMS'], summary: 'Create SMS template', responses: { 201: { description: 'Template created' } } },
    },
    '/sms/send': {
      post: { tags: ['SMS'], summary: 'Send SMS', description: 'Uses Semaphore if API key configured, else logs to console.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['to', 'message'], properties: { to: { type: 'string' }, message: { type: 'string' }, templateId: { type: 'string' } } } } } }, responses: { 200: { description: 'Sent (or simulated) with SmsLog entry' } } },
    },

    // ── PAYMENTS ──────────────────────────────────────────────────────────────
    '/payments/create-link': {
      post: { tags: ['Payments'], summary: 'Create PayMongo payment link', description: 'GCash or Maya. Simulation mode if PAYMONGO_SECRET_KEY not set.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['billId', 'amount', 'method'], properties: { billId: { type: 'string' }, amount: { type: 'number' }, method: { type: 'string', enum: ['gcash', 'maya'] } } } } } }, responses: { 200: { description: 'Checkout URL' } } },
    },
    '/payments/webhook': {
      post: { tags: ['Payments'], summary: 'PayMongo webhook', security: [], description: 'Receives payment confirmation from PayMongo. Updates bill status.', responses: { 200: { description: 'Acknowledged' } } },
    },
  },
};

export function setupSwagger(app: Express): void {
  const options: swaggerUi.SwaggerUiOptions = {
    customCss: '.swagger-ui .topbar { background-color: #1677ff; }',
    customSiteTitle: 'iHIMS API Docs',
    swaggerOptions: { persistAuthorization: true },
  };

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec as any, options));

  // Raw JSON spec (for import into Postman/Insomnia)
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(spec);
  });
}
