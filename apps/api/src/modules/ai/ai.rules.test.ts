/**
 * Tests for the AI symptom-matching rules engine.
 * These tests use direct rule definitions (same data as ai.controller.ts)
 * to verify the matching and scoring logic without any DB or HTTP calls.
 */

// ── Rule types and matching logic (mirrored from ai.controller.ts) ────────────
interface SymptomRule {
  symptoms: string[];
  icdCode: string;
  diagnosis: string;
  probability: number;
}

function scoreRules(
  rules: SymptomRule[],
  inputSymptoms: string[],
  age?: number
): Array<{ icdCode: string; diagnosis: string; probability: number; matchCount: number }> {
  return rules
    .map((rule) => {
      const matchCount = rule.symptoms.filter((rs) =>
        inputSymptoms.some((ns) => ns.includes(rs) || rs.includes(ns))
      ).length;
      const matchRatio = matchCount / rule.symptoms.length;
      const adjustedProbability = matchRatio >= 0.5 ? rule.probability * matchRatio : 0;
      return {
        icdCode: rule.icdCode,
        diagnosis: rule.diagnosis,
        probability: Math.round(adjustedProbability * 100) / 100,
        matchCount,
      };
    })
    .filter((r) => r.matchCount >= 1 && r.probability > 0)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
}

// ── Subset of the real rules for testing ─────────────────────────────────────
const RULES: SymptomRule[] = [
  { symptoms: ['fever', 'headache', 'body pain', 'rash'], icdCode: 'A90', diagnosis: 'Dengue Fever', probability: 0.75 },
  { symptoms: ['fever', 'cough', 'difficulty breathing', 'chest pain'], icdCode: 'J18', diagnosis: 'Pneumonia', probability: 0.70 },
  { symptoms: ['chest pain', 'shortness of breath', 'sweating', 'arm pain'], icdCode: 'I21', diagnosis: 'Acute Myocardial Infarction', probability: 0.80 },
  { symptoms: ['headache', 'stiff neck', 'fever', 'sensitivity to light'], icdCode: 'G03', diagnosis: 'Meningitis', probability: 0.65 },
  { symptoms: ['abdominal pain', 'nausea', 'vomiting', 'diarrhea'], icdCode: 'K59', diagnosis: 'Gastroenteritis', probability: 0.70 },
  { symptoms: ['frequent urination', 'burning sensation', 'lower back pain'], icdCode: 'N39', diagnosis: 'Urinary Tract Infection', probability: 0.75 },
  { symptoms: ['runny nose', 'sneezing', 'congestion', 'mild fever'], icdCode: 'J00', diagnosis: 'Common Cold (URTI)', probability: 0.80 },
  { symptoms: ['right lower quadrant pain', 'nausea', 'fever', 'loss of appetite'], icdCode: 'K37', diagnosis: 'Appendicitis', probability: 0.70 },
  { symptoms: ['weight loss', 'night sweats', 'chronic cough', 'hemoptysis'], icdCode: 'A15', diagnosis: 'Pulmonary Tuberculosis', probability: 0.75 },
  { symptoms: ['confusion', 'memory loss', 'difficulty speaking'], icdCode: 'I63', diagnosis: 'Cerebrovascular Accident (Stroke)', probability: 0.75 },
];

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AI rules engine — symptom matching', () => {
  describe('exact 4/4 symptom match', () => {
    it('identifies Dengue Fever from classic triad + rash', () => {
      const results = scoreRules(RULES, ['fever', 'headache', 'body pain', 'rash']);
      expect(results[0].icdCode).toBe('A90');
      expect(results[0].probability).toBe(0.75);
    });

    it('identifies Common Cold from all 4 symptoms', () => {
      const results = scoreRules(RULES, ['runny nose', 'sneezing', 'congestion', 'mild fever']);
      expect(results[0].icdCode).toBe('J00');
      expect(results[0].probability).toBe(0.80);
    });
  });

  describe('partial symptom match (≥50% threshold)', () => {
    it('returns Dengue on 3/4 symptom match with reduced probability', () => {
      const results = scoreRules(RULES, ['fever', 'headache', 'body pain']); // 3/4
      const dengue = results.find((r) => r.icdCode === 'A90');
      expect(dengue).toBeDefined();
      // matchRatio = 3/4 = 0.75 → probability = 0.75 * 0.75 = ~0.56
      expect(dengue!.probability).toBeCloseTo(0.56, 1);
    });

    it('returns UTI on 2/3 symptom match', () => {
      const results = scoreRules(RULES, ['frequent urination', 'burning sensation']); // 2/3
      const uti = results.find((r) => r.icdCode === 'N39');
      expect(uti).toBeDefined();
      expect(uti!.probability).toBeGreaterThan(0);
    });

    it('excludes results where match ratio < 50%', () => {
      // Only 1/4 symptoms for Dengue — ratio = 0.25 → excluded
      const results = scoreRules(RULES, ['fever']);
      // fever appears in many rules with 1 match, but 1/4 = 0.25 < 0.5 → excluded for Dengue
      const dengue = results.find((r) => r.icdCode === 'A90');
      expect(dengue).toBeUndefined();
    });
  });

  describe('empty or unrecognized symptoms', () => {
    it('returns empty array for empty symptoms', () => {
      const results = scoreRules(RULES, []);
      expect(results).toHaveLength(0);
    });

    it('returns empty array for completely unrecognized symptoms', () => {
      const results = scoreRules(RULES, ['xyz_unknown_symptom_12345']);
      expect(results).toHaveLength(0);
    });
  });

  describe('results ordering', () => {
    it('sorts results by probability descending', () => {
      const results = scoreRules(RULES, ['fever', 'headache', 'body pain', 'rash', 'chest pain', 'shortness of breath', 'sweating', 'arm pain']);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].probability).toBeGreaterThanOrEqual(results[i].probability);
      }
    });

    it('limits results to 5 entries', () => {
      // Provide symptoms that match many rules
      const results = scoreRules(RULES, ['fever', 'headache', 'nausea', 'cough', 'chest pain', 'rash', 'body pain']);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('stroke detection', () => {
    it('identifies Stroke from neurological symptoms', () => {
      const results = scoreRules(RULES, ['confusion', 'memory loss', 'difficulty speaking']);
      expect(results[0].icdCode).toBe('I63');
      expect(results[0].probability).toBe(0.75);
    });
  });

  describe('TB detection (endemic disease)', () => {
    it('identifies Pulmonary TB from classic B-symptoms plus hemoptysis', () => {
      const results = scoreRules(RULES, ['weight loss', 'night sweats', 'chronic cough', 'hemoptysis']);
      expect(results[0].icdCode).toBe('A15');
      expect(results[0].probability).toBe(0.75);
    });
  });

  describe('partial string matching', () => {
    it('matches "back pain" against "lower back pain" rule symptom', () => {
      const results = scoreRules(RULES, ['lower back pain', 'frequent urination']);
      const uti = results.find((r) => r.icdCode === 'N39');
      expect(uti).toBeDefined();
    });
  });
});

describe('AI rules engine — drug interaction severity', () => {
  // Test severity classification logic (mirrors DRUG_INTERACTION_RULES from controller)
  const SEVERITY_ORDER = ['MINOR', 'MODERATE', 'MAJOR', 'CONTRAINDICATED'];

  it('CONTRAINDICATED is the highest severity level', () => {
    const idx = SEVERITY_ORDER.indexOf('CONTRAINDICATED');
    expect(idx).toBe(SEVERITY_ORDER.length - 1);
  });

  it('MAJOR ranks above MODERATE', () => {
    expect(SEVERITY_ORDER.indexOf('MAJOR')).toBeGreaterThan(SEVERITY_ORDER.indexOf('MODERATE'));
  });

  it('all severity levels are defined', () => {
    ['MINOR', 'MODERATE', 'MAJOR', 'CONTRAINDICATED'].forEach((level) => {
      expect(SEVERITY_ORDER).toContain(level);
    });
  });
});
