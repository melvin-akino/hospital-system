import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

// ============ SYMPTOM RULES ============
interface SymptomRule {
  symptoms: string[];
  icdCode: string;
  diagnosis: string;
  probability: number;
  reasoning: string;
}

const SYMPTOM_RULES: SymptomRule[] = [
  {
    symptoms: ['fever', 'headache', 'body pain', 'rash'],
    icdCode: 'A90',
    diagnosis: 'Dengue Fever',
    probability: 0.75,
    reasoning: 'Classic dengue triad: fever, severe headache, myalgia, and rash are hallmarks of dengue fever — a mosquito-borne illness endemic in the Philippines.',
  },
  {
    symptoms: ['fever', 'cough', 'difficulty breathing', 'chest pain'],
    icdCode: 'J18',
    diagnosis: 'Pneumonia',
    probability: 0.70,
    reasoning: 'Combination of productive cough, fever, and chest pain with breathing difficulty suggests lower respiratory tract infection / pneumonia.',
  },
  {
    symptoms: ['chest pain', 'shortness of breath', 'sweating', 'arm pain'],
    icdCode: 'I21',
    diagnosis: 'Acute Myocardial Infarction',
    probability: 0.80,
    reasoning: 'Classic STEMI presentation: crushing chest pain radiating to arm, diaphoresis, and dyspnea are cardinal signs of acute MI requiring immediate intervention.',
  },
  {
    symptoms: ['headache', 'stiff neck', 'fever', 'sensitivity to light'],
    icdCode: 'G03',
    diagnosis: 'Meningitis',
    probability: 0.65,
    reasoning: 'Kernig\'s and Brudzinski\'s triad: nuchal rigidity + fever + photophobia strongly suggest meningeal irritation — bacterial or viral meningitis.',
  },
  {
    symptoms: ['abdominal pain', 'nausea', 'vomiting', 'diarrhea'],
    icdCode: 'K59',
    diagnosis: 'Gastroenteritis',
    probability: 0.70,
    reasoning: 'GI symptom cluster of nausea, vomiting, diarrhea, and abdominal cramping is consistent with acute gastroenteritis, possibly viral or food-borne.',
  },
  {
    symptoms: ['frequent urination', 'burning sensation', 'lower back pain'],
    icdCode: 'N39',
    diagnosis: 'Urinary Tract Infection',
    probability: 0.75,
    reasoning: 'Dysuria with frequency and costovertebral angle tenderness suggests ascending UTI, possibly pyelonephritis if back pain is prominent.',
  },
  {
    symptoms: ['excessive thirst', 'frequent urination', 'blurred vision', 'fatigue'],
    icdCode: 'E11',
    diagnosis: 'Type 2 Diabetes Mellitus',
    probability: 0.65,
    reasoning: 'Classic hyperglycemia symptoms: polydipsia, polyuria, blurred vision from osmotic lens changes, and fatigue suggest uncontrolled diabetes mellitus.',
  },
  {
    symptoms: ['chest tightness', 'wheezing', 'cough', 'shortness of breath'],
    icdCode: 'J45',
    diagnosis: 'Asthma',
    probability: 0.75,
    reasoning: 'Reversible airflow obstruction hallmarks: expiratory wheezing, chest tightness, and dry cough — especially if episodic — are consistent with bronchial asthma.',
  },
  {
    symptoms: ['headache', 'dizziness', 'blurred vision', 'palpitations'],
    icdCode: 'I10',
    diagnosis: 'Hypertension',
    probability: 0.65,
    reasoning: 'Occipital headache, dizziness, visual disturbance, and palpitations are common presentations of elevated blood pressure requiring BP measurement confirmation.',
  },
  {
    symptoms: ['joint pain', 'swelling', 'morning stiffness', 'fatigue'],
    icdCode: 'M06',
    diagnosis: 'Rheumatoid Arthritis',
    probability: 0.60,
    reasoning: 'Symmetric joint involvement with prolonged morning stiffness >1 hour, swelling, and systemic fatigue suggests inflammatory arthritis — RA being most common.',
  },
  {
    symptoms: ['fever', 'sore throat', 'swollen lymph nodes', 'fatigue'],
    icdCode: 'J02',
    diagnosis: 'Acute Pharyngitis',
    probability: 0.70,
    reasoning: 'Sore throat with fever and cervical lymphadenopathy suggests bacterial (Group A Strep) or viral pharyngitis. Centor criteria help stratify risk.',
  },
  {
    symptoms: ['runny nose', 'sneezing', 'congestion', 'mild fever'],
    icdCode: 'J00',
    diagnosis: 'Common Cold (URTI)',
    probability: 0.80,
    reasoning: 'Self-limiting viral upper respiratory tract infection. Rhinorrhea, sneezing, and nasal congestion with low-grade fever are classic rhinovirus symptoms.',
  },
  {
    symptoms: ['severe headache', 'nausea', 'vomiting', 'sudden onset'],
    icdCode: 'G43',
    diagnosis: 'Migraine',
    probability: 0.65,
    reasoning: 'Unilateral throbbing headache with nausea/vomiting and photophobia/phonophobia, especially with a prior history, is characteristic of migraine disorder.',
  },
  {
    symptoms: ['right lower quadrant pain', 'nausea', 'fever', 'loss of appetite'],
    icdCode: 'K37',
    diagnosis: 'Appendicitis',
    probability: 0.70,
    reasoning: 'McBurney\'s point tenderness, rebound tenderness, anorexia, and low-grade fever are classic signs of acute appendicitis requiring surgical evaluation.',
  },
  {
    symptoms: ['yellowing skin', 'dark urine', 'fatigue', 'abdominal pain'],
    icdCode: 'K76',
    diagnosis: 'Liver Disease / Hepatitis',
    probability: 0.65,
    reasoning: 'Jaundice with dark urine (bilirubinuria), malaise, and right upper quadrant pain suggest hepatic dysfunction — viral hepatitis, NAFLD, or biliary obstruction.',
  },
  {
    symptoms: ['weight loss', 'night sweats', 'chronic cough', 'hemoptysis'],
    icdCode: 'A15',
    diagnosis: 'Pulmonary Tuberculosis',
    probability: 0.75,
    reasoning: 'The TB triad: chronic productive cough >2 weeks, hemoptysis, night sweats, and unexplained weight loss are classic PTB presentations — endemic in the Philippines.',
  },
  {
    symptoms: ['painful urination', 'penile discharge', 'vaginal discharge'],
    icdCode: 'A54',
    diagnosis: 'Gonorrhea',
    probability: 0.65,
    reasoning: 'Purulent urethral/vaginal discharge with dysuria in a sexually active patient suggests Neisseria gonorrhoeae infection requiring STI testing and treatment.',
  },
  {
    symptoms: ['skin rash', 'itching', 'hives', 'swelling'],
    icdCode: 'L50',
    diagnosis: 'Urticaria / Allergic Reaction',
    probability: 0.70,
    reasoning: 'Pruritic wheals, angioedema, and urticaria suggest IgE-mediated hypersensitivity reaction. Assess for anaphylaxis risk if systemic symptoms present.',
  },
  {
    symptoms: ['fatigue', 'pallor', 'shortness of breath', 'dizziness'],
    icdCode: 'D64',
    diagnosis: 'Anemia',
    probability: 0.65,
    reasoning: 'Classic anemia symptoms: pallor, fatigue, exertional dyspnea, and dizziness reflect reduced oxygen-carrying capacity. CBC with indices required for classification.',
  },
  {
    symptoms: ['palpitations', 'irregular heartbeat', 'dizziness', 'fainting'],
    icdCode: 'I49',
    diagnosis: 'Cardiac Arrhythmia',
    probability: 0.65,
    reasoning: 'Palpitations with irregular rhythm, pre-syncope or syncope suggest cardiac arrhythmia. ECG is essential for diagnosis — may range from benign PACs to AF/VT.',
  },
  {
    symptoms: ['severe abdominal pain', 'back pain', 'blood in urine'],
    icdCode: 'N20',
    diagnosis: 'Kidney Stones (Urolithiasis)',
    probability: 0.70,
    reasoning: 'Colicky flank pain radiating to groin, hematuria, and restlessness are pathognomonic for renal/ureteral calculi. KUB or CT urogram confirms diagnosis.',
  },
  {
    symptoms: ['cough', 'fever', 'night sweats', 'weight loss', 'fatigue'],
    icdCode: 'J22',
    diagnosis: 'Lower Respiratory Infection',
    probability: 0.65,
    reasoning: 'Constitutional symptoms with respiratory involvement suggest lower respiratory tract infection. Differentiate TB from CAP using AFB smear and chest X-ray.',
  },
  {
    symptoms: ['facial pain', 'nasal congestion', 'fever', 'headache'],
    icdCode: 'J32',
    diagnosis: 'Sinusitis',
    probability: 0.70,
    reasoning: 'Facial pain/pressure with purulent nasal discharge, fever, and headache after a viral URTI suggests acute bacterial sinusitis. Post-nasal drip may cause cough.',
  },
  {
    symptoms: ['ear pain', 'fever', 'hearing loss'],
    icdCode: 'H66',
    diagnosis: 'Otitis Media',
    probability: 0.70,
    reasoning: 'Otalgia with fever and conductive hearing loss in children/adults suggests acute otitis media. Otoscopy reveals red bulging tympanic membrane.',
  },
  {
    symptoms: ['eye redness', 'discharge', 'itching', 'tearing'],
    icdCode: 'H10',
    diagnosis: 'Conjunctivitis',
    probability: 0.75,
    reasoning: 'Red eye with discharge and tearing without pain or visual change suggests conjunctivitis. Purulent discharge → bacterial; watery/itchy → allergic or viral.',
  },
  {
    symptoms: ['excessive hunger', 'weight loss', 'fatigue', 'blurred vision'],
    icdCode: 'E10',
    diagnosis: 'Type 1 Diabetes Mellitus',
    probability: 0.65,
    reasoning: 'Polyphagia with weight loss despite adequate intake, fatigue, and blurred vision in younger patients suggests autoimmune T1DM with relative insulin deficiency.',
  },
  {
    symptoms: ['lower back pain', 'radiating leg pain', 'numbness'],
    icdCode: 'M54',
    diagnosis: 'Low Back Pain / Sciatica',
    probability: 0.70,
    reasoning: 'Dermatomal leg pain with lower back pain suggests nerve root compression (L4-S1). Positive SLR test, paresthesia, and weakness indicate radiculopathy.',
  },
  {
    symptoms: ['confusion', 'memory loss', 'difficulty speaking'],
    icdCode: 'I63',
    diagnosis: 'Cerebrovascular Accident (Stroke)',
    probability: 0.75,
    reasoning: 'FAST criteria (Face drooping, Arm weakness, Speech difficulty, Time to call) — sudden onset neurological deficits require immediate CT head and stroke protocol activation.',
  },
  {
    symptoms: ['abdominal pain', 'bloating', 'alternating diarrhea', 'constipation'],
    icdCode: 'K58',
    diagnosis: 'Irritable Bowel Syndrome',
    probability: 0.65,
    reasoning: 'Rome IV criteria: recurrent abdominal pain with altered bowel habits (diarrhea/constipation alternating), bloating, and relief with defecation suggest IBS.',
  },
  {
    symptoms: ['lump', 'unexplained weight loss', 'fatigue', 'night sweats'],
    icdCode: 'C80',
    diagnosis: 'Malignant Neoplasm (unspecified)',
    probability: 0.50,
    reasoning: 'Constitutional B-symptoms (weight loss >10%, drenching night sweats, fatigue) with a palpable lump warrant urgent workup for malignancy including biopsy and imaging.',
  },
  {
    symptoms: ['chest pain', 'fever', 'cough', 'pleuritic pain'],
    icdCode: 'J90',
    diagnosis: 'Pleural Effusion / Pleuritis',
    probability: 0.60,
    reasoning: 'Pleuritic chest pain worsening with inspiration, associated fever and cough may indicate pleuritis or pleural effusion. Chest X-ray and ultrasound are diagnostic.',
  },
];

// ============ DRUG INTERACTION RULES ============
const DRUG_INTERACTION_RULES: Record<string, Record<string, { severity: string; description: string }>> = {
  warfarin: {
    aspirin: { severity: 'MAJOR', description: 'Concurrent use increases risk of bleeding significantly. Avoid combination or monitor closely with INR checks.' },
    ibuprofen: { severity: 'MAJOR', description: 'NSAIDs increase anticoagulant effect and GI bleeding risk when combined with warfarin.' },
    metronidazole: { severity: 'MAJOR', description: 'Metronidazole inhibits warfarin metabolism, markedly increasing INR and bleeding risk.' },
    amiodarone: { severity: 'CONTRAINDICATED', description: 'Amiodarone potently inhibits warfarin metabolism. Concomitant use causes severe anticoagulation.' },
  },
  metformin: {
    alcohol: { severity: 'MAJOR', description: 'Alcohol potentiates metformin-induced lactic acidosis risk, especially with heavy use.' },
    contrast: { severity: 'MAJOR', description: 'Iodinated contrast media increases lactic acidosis risk. Hold metformin 48h before/after contrast procedures.' },
  },
  simvastatin: {
    amiodarone: { severity: 'MAJOR', description: 'Amiodarone inhibits CYP3A4, increasing simvastatin levels and myopathy/rhabdomyolysis risk.' },
    clarithromycin: { severity: 'MAJOR', description: 'CYP3A4 inhibition by clarithromycin can cause dangerous elevation of statin levels.' },
    fluconazole: { severity: 'MODERATE', description: 'Azole antifungals inhibit statin metabolism, increasing myopathy risk.' },
  },
  amlodipine: {
    simvastatin: { severity: 'MODERATE', description: 'Amlodipine modestly inhibits simvastatin metabolism; limit simvastatin to 20mg with amlodipine.' },
    cyclosporine: { severity: 'MAJOR', description: 'Cyclosporine markedly increases amlodipine concentrations, risking hypotension.' },
  },
  lisinopril: {
    potassium: { severity: 'MODERATE', description: 'ACE inhibitors reduce potassium excretion; concurrent potassium supplementation risks hyperkalemia.' },
    spironolactone: { severity: 'MAJOR', description: 'Combination can cause life-threatening hyperkalemia, especially in renal impairment.' },
    nsaids: { severity: 'MODERATE', description: 'NSAIDs reduce antihypertensive efficacy of ACE inhibitors and may worsen renal function.' },
  },
};

// ============ POST /api/ai/diagnose ============
export const diagnose = asyncHandler(async (req: Request, res: Response) => {
  const { symptoms, age, gender } = req.body;

  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    errorResponse(res, 'symptoms array is required', 400);
    return;
  }

  const normalizedSymptoms = (symptoms as string[]).map((s) => s.toLowerCase().trim());

  // Score each rule by symptom match
  const scored = SYMPTOM_RULES.map((rule) => {
    const matchCount = rule.symptoms.filter((rs) =>
      normalizedSymptoms.some((ns) => ns.includes(rs) || rs.includes(ns))
    ).length;
    const matchRatio = matchCount / rule.symptoms.length;
    const adjustedProbability = matchRatio >= 0.5 ? rule.probability * matchRatio : 0;

    return {
      icdCode: rule.icdCode,
      diagnosis: rule.diagnosis,
      probability: Math.round(adjustedProbability * 100) / 100,
      reasoning: rule.reasoning,
      matchCount,
      totalSymptoms: rule.symptoms.length,
    };
  })
    .filter((r) => r.matchCount >= 1 && r.probability > 0)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);

  // Age-based adjustments
  const suggestions = scored.map((s) => {
    let prob = s.probability;
    const ageNum = Number(age);
    if (ageNum > 60 && ['I21', 'I10', 'I63', 'E11'].includes(s.icdCode)) prob = Math.min(0.95, prob + 0.1);
    if (ageNum < 18 && ['J00', 'H66', 'J02', 'J45'].includes(s.icdCode)) prob = Math.min(0.95, prob + 0.05);
    return { ...s, probability: Math.round(prob * 100) / 100 };
  });

  successResponse(res, {
    suggestions,
    inputSymptoms: normalizedSymptoms,
    disclaimer:
      'This AI output is for clinical decision support only. It is not a substitute for professional clinical judgment, physical examination, or laboratory testing.',
  });
});

// ============ POST /api/ai/check-interactions ============
export const checkDrugInteractions = asyncHandler(async (req: Request, res: Response) => {
  const { drugIds } = req.body;

  if (!drugIds || !Array.isArray(drugIds) || drugIds.length < 2) {
    errorResponse(res, 'At least 2 drugIds required', 400);
    return;
  }

  // Fetch medication names
  const medications = await prisma.inventoryItem.findMany({
    where: { id: { in: drugIds as string[] } },
    include: {
      medication: { select: { genericName: true, brandName: true, drugClass: true } },
    },
  });

  const interactions: Array<{
    drug1: string;
    drug2: string;
    severity: string;
    description: string;
  }> = [];

  // Check Prisma DrugInteraction table if it exists
  try {
    const dbInteractions = await (prisma as any).drugInteraction?.findMany({
      where: {
        OR: drugIds.flatMap((id1: string, i: number) =>
          drugIds.slice(i + 1).map((id2: string) => ({
            OR: [
              { drug1Id: id1, drug2Id: id2 },
              { drug1Id: id2, drug2Id: id1 },
            ],
          }))
        ),
      },
    });

    if (dbInteractions) {
      for (const dbI of dbInteractions) {
        const d1 = medications.find((m) => m.id === dbI.drug1Id);
        const d2 = medications.find((m) => m.id === dbI.drug2Id);
        if (d1 && d2) {
          interactions.push({
            drug1: d1.medication?.genericName ?? d1.itemName,
            drug2: d2.medication?.genericName ?? d2.itemName,
            severity: dbI.severity,
            description: dbI.description,
          });
        }
      }
    }
  } catch {
    // DrugInteraction table may not exist, continue with rule-based
  }

  // Rule-based checks
  const medNames = medications.map((m) => (m.medication?.genericName ?? m.itemName).toLowerCase());

  for (let i = 0; i < medNames.length; i++) {
    for (let j = i + 1; j < medNames.length; j++) {
      const name1 = medNames[i]!;
      const name2 = medNames[j]!;

      // Check rule table
      for (const [drug, interactions_map] of Object.entries(DRUG_INTERACTION_RULES)) {
        const matchDrug = name1.includes(drug) || name2.includes(drug);
        if (matchDrug) {
          for (const [interactant, detail] of Object.entries(interactions_map)) {
            const matchInteractant =
              (name1.includes(interactant) && name2.includes(drug)) ||
              (name2.includes(interactant) && name1.includes(drug));
            if (matchInteractant) {
              // Avoid duplicates
              const alreadyFound = interactions.some(
                (x) =>
                  (x.drug1.toLowerCase().includes(drug) || x.drug2.toLowerCase().includes(drug)) &&
                  (x.drug1.toLowerCase().includes(interactant) ||
                    x.drug2.toLowerCase().includes(interactant))
              );
              if (!alreadyFound) {
                interactions.push({
                  drug1: medications[i]?.medication?.genericName ?? medications[i]?.itemName ?? name1,
                  drug2: medications[j]?.medication?.genericName ?? medications[j]?.itemName ?? name2,
                  severity: detail.severity,
                  description: detail.description,
                });
              }
            }
          }
        }
      }
    }
  }

  const safe = interactions.length === 0;
  successResponse(res, {
    interactions,
    safe,
    checkedMedications: medications.map((m) => ({
      id: m.id,
      name: m.medication?.genericName ?? m.itemName,
      brandName: m.medication?.brandName,
    })),
    disclaimer:
      'Drug interaction checking is for clinical decision support only. Always consult a clinical pharmacist for complex regimens.',
  });
});

// ============ POST /api/ai/predict-readmission-risk ============
export const predictReadmissionRisk = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.body;

  if (!patientId) {
    errorResponse(res, 'patientId is required', 400);
    return;
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId as string },
    include: {
      admissions: {
        orderBy: { admittedAt: 'desc' },
        take: 10,
      },
      medications: {
        where: { isActive: true },
      },
      allergies: { where: { isActive: true } },
      consultations: {
        orderBy: { scheduledAt: 'desc' },
        take: 20,
      },
      vitalSigns: {
        orderBy: { recordedAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const factors: string[] = [];
  const recommendations: string[] = [];
  let score = 0;

  // Age risk
  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)
  );
  if (age >= 75) {
    score += 25;
    factors.push(`Advanced age (${age} years) — significantly increased physiological vulnerability`);
    recommendations.push('Schedule regular geriatric assessments and fall prevention measures');
  } else if (age >= 65) {
    score += 15;
    factors.push(`Elderly patient (${age} years) — increased comorbidity risk`);
    recommendations.push('Ensure comprehensive discharge planning with follow-up within 7 days');
  }

  // Recent admissions in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const recentAdmissions = patient.admissions.filter(
    (a) => new Date(a.admittedAt) >= thirtyDaysAgo
  );
  if (recentAdmissions.length >= 2) {
    score += 30;
    factors.push(`${recentAdmissions.length} admissions in the last 30 days — pattern of frequent readmissions`);
    recommendations.push('Conduct root cause analysis for readmissions; consider care management program enrollment');
  } else if (recentAdmissions.length === 1) {
    score += 20;
    factors.push('Previous admission within last 30 days — recent acute illness episode');
    recommendations.push('Ensure medication adherence counseling and close outpatient follow-up');
  }

  // Polypharmacy (>5 active medications)
  const activeMedCount = patient.medications.length;
  if (activeMedCount > 8) {
    score += 20;
    factors.push(`High polypharmacy (${activeMedCount} active medications) — increased adverse drug event risk`);
    recommendations.push('Perform medication reconciliation and deprescribing review with clinical pharmacist');
  } else if (activeMedCount > 5) {
    score += 10;
    factors.push(`Polypharmacy (${activeMedCount} active medications) — moderate complexity`);
    recommendations.push('Review medication list for potential interactions and redundancies');
  }

  // Chronic conditions inferred from consultations / ICD codes
  const allIcdCodes = patient.consultations.flatMap((c) => c.icdCodes);
  const hasHypertension = allIcdCodes.some((c) => c.startsWith('I10') || c.startsWith('I11'));
  const hasDiabetes = allIcdCodes.some((c) => c.startsWith('E11') || c.startsWith('E10'));
  const hasHeartDisease = allIcdCodes.some((c) => c.startsWith('I2') || c.startsWith('I5'));
  const hasCKD = allIcdCodes.some((c) => c.startsWith('N18'));
  const hasCOPD = allIcdCodes.some((c) => c.startsWith('J44'));

  if (hasHypertension) {
    score += 10;
    factors.push('Hypertension — chronic cardiovascular risk factor requiring consistent management');
    recommendations.push('Ensure antihypertensive compliance; target BP <130/80 mmHg');
  }
  if (hasDiabetes) {
    score += 10;
    factors.push('Diabetes mellitus — chronic metabolic disease with multi-organ complications risk');
    recommendations.push('HbA1c monitoring every 3 months; foot care education; ophthalmology referral');
  }
  if (hasHeartDisease) {
    score += 15;
    factors.push('Cardiac disease history — significant readmission risk factor for decompensation');
    recommendations.push('Daily weight monitoring; fluid restriction counseling; cardiology follow-up');
  }
  if (hasCKD) {
    score += 15;
    factors.push('Chronic kidney disease — nephrotoxic medication avoidance and fluid management critical');
    recommendations.push('Nephrology follow-up; restrict nephrotoxic drugs; monitor creatinine and electrolytes');
  }
  if (hasCOPD) {
    score += 10;
    factors.push('COPD — respiratory exacerbation and hospital readmission risk');
    recommendations.push('Ensure inhaler technique education; influenza and pneumococcal vaccination');
  }

  // Vital signs abnormalities
  const latestVital = patient.vitalSigns[0];
  if (latestVital) {
    if (latestVital.oxygenSaturation && Number(latestVital.oxygenSaturation) < 92) {
      score += 20;
      factors.push(`Low oxygen saturation (${latestVital.oxygenSaturation}%) — indicates active respiratory compromise`);
      recommendations.push('Urgent respiratory assessment; supplemental oxygen therapy; pulmonology consult');
    }
    if (
      latestVital.bloodPressureSystolic &&
      (latestVital.bloodPressureSystolic > 180 || latestVital.bloodPressureSystolic < 90)
    ) {
      score += 15;
      factors.push(`Abnormal blood pressure (${latestVital.bloodPressureSystolic}/${latestVital.bloodPressureDiastolic} mmHg) — hemodynamic instability`);
      recommendations.push('Close BP monitoring; adjust antihypertensive regimen as needed');
    }
  }

  const finalScore = Math.min(100, score);
  let risk: 'LOW' | 'MEDIUM' | 'HIGH';
  if (finalScore >= 50) risk = 'HIGH';
  else if (finalScore >= 25) risk = 'MEDIUM';
  else risk = 'LOW';

  if (factors.length === 0) {
    factors.push('No significant risk factors identified at this time');
    recommendations.push('Continue routine preventive care and scheduled follow-up visits');
  }

  successResponse(res, {
    risk,
    score: finalScore,
    factors,
    recommendations,
    patientAge: age,
    totalAdmissions: patient.admissions.length,
    recentAdmissions30d: recentAdmissions.length,
    activeMedications: activeMedCount,
    disclaimer:
      'Risk prediction is algorithmic and for clinical guidance only. Clinical judgment remains paramount in treatment decisions.',
  });
});

// ============ POST /api/ai/check-allergies ============
export const checkAllergiesContraindications = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, medicationId } = req.body;

  if (!patientId || !medicationId) {
    errorResponse(res, 'patientId and medicationId are required', 400);
    return;
  }

  const [patient, medItem] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId as string },
      include: { allergies: { where: { isActive: true } } },
    }),
    prisma.inventoryItem.findUnique({
      where: { id: medicationId as string },
      include: { medication: true },
    }),
  ]);

  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }
  if (!medItem) {
    errorResponse(res, 'Medication not found', 404);
    return;
  }

  const warnings: Array<{
    allergen: string;
    reaction: string;
    severity: string;
    medication: string;
  }> = [];

  const genericName = (medItem.medication?.genericName ?? medItem.itemName).toLowerCase();
  const drugClass = (medItem.medication?.drugClass ?? '').toLowerCase();

  // Cross-reference allergies
  for (const allergy of patient.allergies) {
    const allergen = allergy.allergen.toLowerCase();

    // Direct name match
    if (genericName.includes(allergen) || allergen.includes(genericName)) {
      warnings.push({
        allergen: allergy.allergen,
        reaction: allergy.reaction ?? 'Unknown reaction',
        severity: allergy.severity,
        medication: medItem.medication?.genericName ?? medItem.itemName,
      });
      continue;
    }

    // Drug class cross-reactivity
    if (drugClass && (drugClass.includes(allergen) || allergen.includes(drugClass))) {
      warnings.push({
        allergen: allergy.allergen,
        reaction: `Cross-reactivity with drug class: ${medItem.medication?.drugClass}. Patient's known reaction: ${allergy.reaction ?? 'Unknown'}`,
        severity: allergy.severity,
        medication: medItem.medication?.genericName ?? medItem.itemName,
      });
      continue;
    }

    // Known cross-reactivity pairs
    const crossReactivity: Record<string, string[]> = {
      penicillin: ['amoxicillin', 'ampicillin', 'cephalosporin', 'piperacillin'],
      sulfa: ['sulfamethoxazole', 'trimethoprim-sulfamethoxazole', 'furosemide', 'hydrochlorothiazide'],
      aspirin: ['ibuprofen', 'naproxen', 'diclofenac', 'mefenamic acid', 'nsaid'],
      cephalosporin: ['penicillin', 'amoxicillin'],
      codeine: ['morphine', 'oxycodone', 'tramadol', 'opioid'],
    };

    for (const [allergenBase, crossList] of Object.entries(crossReactivity)) {
      if (allergen.includes(allergenBase) && crossList.some((c) => genericName.includes(c))) {
        warnings.push({
          allergen: allergy.allergen,
          reaction: `Potential cross-reactivity: ${allergy.allergen} allergy may cross-react with ${medItem.medication?.genericName ?? medItem.itemName}`,
          severity: 'MODERATE',
          medication: medItem.medication?.genericName ?? medItem.itemName,
        });
      }
    }
  }

  const safe = warnings.length === 0;
  successResponse(res, {
    safe,
    warnings,
    patient: {
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      knownAllergies: patient.allergies.map((a) => ({
        allergen: a.allergen,
        severity: a.severity,
        reaction: a.reaction,
      })),
    },
    medication: {
      id: medItem.id,
      genericName: medItem.medication?.genericName ?? medItem.itemName,
      brandName: medItem.medication?.brandName,
      drugClass: medItem.medication?.drugClass,
    },
    disclaimer:
      'Allergy checking is algorithmic. Always verify with patient directly and consult pharmacist for high-severity alerts.',
  });
});

// ============ POST /api/ai/vital-signs-analysis ============
export const analyzeVitalSigns = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.body;

  if (!patientId) {
    errorResponse(res, 'patientId is required', 400);
    return;
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId as string },
    include: {
      vitalSigns: {
        orderBy: { recordedAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  if (patient.vitalSigns.length === 0) {
    successResponse(res, {
      alerts: [],
      overallStatus: 'NORMAL',
      message: 'No vital signs recorded for this patient',
      vitals: [],
    });
    return;
  }

  const alerts: Array<{
    parameter: string;
    value: string;
    status: 'NORMAL' | 'ABNORMAL' | 'CRITICAL';
    recommendation: string;
  }> = [];

  const latest = patient.vitalSigns[0]!;

  // Temperature analysis
  if (latest.temperature !== null) {
    const temp = Number(latest.temperature);
    if (temp >= 39.5) {
      alerts.push({
        parameter: 'Temperature',
        value: `${temp}°C`,
        status: 'CRITICAL',
        recommendation: 'High-grade fever (≥39.5°C). Initiate fever workup: CBC, blood cultures, chest X-ray. Administer antipyretics; consider IV fluid resuscitation.',
      });
    } else if (temp >= 37.6) {
      alerts.push({
        parameter: 'Temperature',
        value: `${temp}°C`,
        status: 'ABNORMAL',
        recommendation: 'Low-grade fever (37.6-39.4°C). Monitor every 4 hours; investigate source of infection. Encourage hydration.',
      });
    } else if (temp < 36.0) {
      alerts.push({
        parameter: 'Temperature',
        value: `${temp}°C`,
        status: 'ABNORMAL',
        recommendation: 'Hypothermia (<36°C). Apply warming measures; assess for sepsis, hypothyroidism, or environmental exposure.',
      });
    }
  }

  // Blood pressure analysis
  if (latest.bloodPressureSystolic !== null && latest.bloodPressureDiastolic !== null) {
    const sys = latest.bloodPressureSystolic;
    const dia = latest.bloodPressureDiastolic;
    if (sys >= 180 || dia >= 120) {
      alerts.push({
        parameter: 'Blood Pressure',
        value: `${sys}/${dia} mmHg`,
        status: 'CRITICAL',
        recommendation: 'Hypertensive crisis (≥180/120 mmHg). Assess for end-organ damage (headache, vision changes, chest pain). Immediate physician notification required.',
      });
    } else if (sys >= 140 || dia >= 90) {
      alerts.push({
        parameter: 'Blood Pressure',
        value: `${sys}/${dia} mmHg`,
        status: 'ABNORMAL',
        recommendation: 'Stage 2 hypertension (≥140/90 mmHg). Ensure antihypertensive medications are administered. Recheck in 30 minutes.',
      });
    } else if (sys < 90 || dia < 60) {
      alerts.push({
        parameter: 'Blood Pressure',
        value: `${sys}/${dia} mmHg`,
        status: 'CRITICAL',
        recommendation: 'Hypotension (<90/60 mmHg). Assess for shock: check HR, skin perfusion, urine output. IV fluid challenge; notify physician immediately.',
      });
    }
  }

  // Heart rate analysis
  if (latest.heartRate !== null) {
    const hr = latest.heartRate;
    if (hr > 120) {
      alerts.push({
        parameter: 'Heart Rate',
        value: `${hr} bpm`,
        status: 'CRITICAL',
        recommendation: 'Significant tachycardia (>120 bpm). Assess for fever, dehydration, pain, arrhythmia. Obtain 12-lead ECG; check electrolytes.',
      });
    } else if (hr > 100) {
      alerts.push({
        parameter: 'Heart Rate',
        value: `${hr} bpm`,
        status: 'ABNORMAL',
        recommendation: 'Tachycardia (100-120 bpm). Investigate underlying cause: anxiety, dehydration, fever, thyrotoxicosis.',
      });
    } else if (hr < 50) {
      alerts.push({
        parameter: 'Heart Rate',
        value: `${hr} bpm`,
        status: 'CRITICAL',
        recommendation: 'Significant bradycardia (<50 bpm). Assess for heart block, medication effect (beta-blockers, digoxin). 12-lead ECG and physician notification.',
      });
    } else if (hr < 60) {
      alerts.push({
        parameter: 'Heart Rate',
        value: `${hr} bpm`,
        status: 'ABNORMAL',
        recommendation: 'Bradycardia (50-59 bpm). Monitor for symptoms (dizziness, syncope). Review medications.',
      });
    }
  }

  // Respiratory rate analysis
  if (latest.respiratoryRate !== null) {
    const rr = latest.respiratoryRate;
    if (rr > 30) {
      alerts.push({
        parameter: 'Respiratory Rate',
        value: `${rr} breaths/min`,
        status: 'CRITICAL',
        recommendation: 'Severe tachypnea (>30 breaths/min). Assess oxygen saturation; consider respiratory failure. Supplemental oxygen; urgent physician review.',
      });
    } else if (rr > 20) {
      alerts.push({
        parameter: 'Respiratory Rate',
        value: `${rr} breaths/min`,
        status: 'ABNORMAL',
        recommendation: 'Tachypnea (21-30 breaths/min). Assess for pain, anxiety, infection. Monitor O2 saturation closely.',
      });
    } else if (rr < 10) {
      alerts.push({
        parameter: 'Respiratory Rate',
        value: `${rr} breaths/min`,
        status: 'CRITICAL',
        recommendation: 'Bradypnea (<10 breaths/min). Risk of respiratory depression. Check for opioid administration; be prepared for airway management.',
      });
    }
  }

  // Oxygen saturation analysis
  if (latest.oxygenSaturation !== null) {
    const spo2 = Number(latest.oxygenSaturation);
    if (spo2 < 88) {
      alerts.push({
        parameter: 'O2 Saturation',
        value: `${spo2}%`,
        status: 'CRITICAL',
        recommendation: 'Critical hypoxemia (<88% SpO2). Immediate supplemental oxygen; consider non-invasive ventilation. Notify physician and respiratory therapy urgently.',
      });
    } else if (spo2 < 92) {
      alerts.push({
        parameter: 'O2 Saturation',
        value: `${spo2}%`,
        status: 'CRITICAL',
        recommendation: 'Significant hypoxemia (<92% SpO2). Administer supplemental oxygen (2-4 L/min via nasal cannula). Recheck in 15 minutes. Physician notification required.',
      });
    } else if (spo2 < 95) {
      alerts.push({
        parameter: 'O2 Saturation',
        value: `${spo2}%`,
        status: 'ABNORMAL',
        recommendation: 'Low-normal oxygen saturation (92-94%). Monitor closely; encourage deep breathing exercises. Consider supplemental oxygen if symptomatic.',
      });
    }
  }

  // BMI analysis
  if (latest.bmi !== null) {
    const bmi = Number(latest.bmi);
    if (bmi >= 35) {
      alerts.push({
        parameter: 'BMI',
        value: `${bmi} kg/m²`,
        status: 'ABNORMAL',
        recommendation: 'Severe obesity (BMI ≥35). Increased risk for sleep apnea, DVT, and anesthetic complications. Nutritional counseling and weight management referral recommended.',
      });
    } else if (bmi < 18.5) {
      alerts.push({
        parameter: 'BMI',
        value: `${bmi} kg/m²`,
        status: 'ABNORMAL',
        recommendation: 'Underweight (BMI <18.5). Malnutrition risk; assess nutritional status; consider dietitian consult and nutritional supplementation.',
      });
    }
  }

  // Trend analysis (BP trend over last 5 readings)
  const bpReadings = patient.vitalSigns
    .filter((v) => v.bloodPressureSystolic !== null)
    .map((v) => v.bloodPressureSystolic!);

  if (bpReadings.length >= 3) {
    const rising = bpReadings.every((val, i) => i === 0 || val >= bpReadings[i - 1]!);
    if (rising && bpReadings[0]! - bpReadings[bpReadings.length - 1]! > 20) {
      alerts.push({
        parameter: 'BP Trend',
        value: `Rising from ${bpReadings[bpReadings.length - 1]} to ${bpReadings[0]} mmHg`,
        status: 'ABNORMAL',
        recommendation: 'Consistently rising blood pressure trend over last readings. Assess medication compliance and consider antihypertensive dose adjustment.',
      });
    }
  }

  // Overall status
  const hasCritical = alerts.some((a) => a.status === 'CRITICAL');
  const hasAbnormal = alerts.some((a) => a.status === 'ABNORMAL');
  const overallStatus: 'NORMAL' | 'WATCH' | 'CRITICAL' = hasCritical
    ? 'CRITICAL'
    : hasAbnormal
      ? 'WATCH'
      : 'NORMAL';

  successResponse(res, {
    alerts,
    overallStatus,
    latestVitals: latest,
    vitalsHistory: patient.vitalSigns,
    disclaimer:
      'Vital signs analysis is automated and for clinical decision support. Always correlate with patient clinical status.',
  });
});
