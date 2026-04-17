/**
 * iHIMS AI Clinical Support Service
 *
 * Uses the Claude API for enhanced clinical decision support when an
 * ANTHROPIC_API_KEY is configured.  Falls back to the built-in rule-based
 * engine when the API key is absent or the API is unreachable.
 *
 * Required env var (optional — rule-based used when absent):
 *   ANTHROPIC_API_KEY    Anthropic API key (from console.anthropic.com)
 *
 * Optional:
 *   AI_MODEL             Claude model ID  (default: claude-haiku-4-5-20251001)
 *   AI_MAX_TOKENS        Max response tokens (default: 1024)
 */

import https from 'https';

// ── Config ─────────────────────────────────────────────────────────────────────

const API_KEY   = process.env['ANTHROPIC_API_KEY'] || '';
const MODEL     = process.env['AI_MODEL']          || 'claude-haiku-4-5-20251001';
const MAX_TOKENS = parseInt(process.env['AI_MAX_TOKENS'] || '1024', 10);
const API_HOST  = 'api.anthropic.com';

export const isAIEnabled = (): boolean => !!API_KEY;

// ── HTTPS helper ───────────────────────────────────────────────────────────────

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

function claudeRequest(
  systemPrompt: string,
  messages: ClaudeMessage[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    });

    const options: https.RequestOptions = {
      hostname: API_HOST,
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw) as ClaudeResponse;
          const text = parsed.content?.[0]?.text ?? '';
          if (!text) reject(new Error(`Empty response from Claude: ${raw.slice(0, 200)}`));
          else resolve(text);
        } catch {
          reject(new Error(`Failed to parse Claude response: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(20_000, () => { req.destroy(); reject(new Error('Claude API request timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Parse JSON from Claude response (strips markdown code fences) ─────────────

function extractJSON(text: string): unknown {
  // Strip ```json...``` or ``` ``` fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  return JSON.parse(raw.trim());
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DiagnosisSuggestion {
  icdCode:      string;
  diagnosis:    string;
  probability:  number;
  reasoning:    string;
  matchCount?:  number;
  totalSymptoms?: number;
}

export interface DrugInteractionResult {
  drug1:       string;
  drug2:       string;
  severity:    string;
  description: string;
}

// ── Diagnosis ─────────────────────────────────────────────────────────────────

const DIAGNOSIS_SYSTEM = `You are an expert clinical decision support AI for a Philippine hospital.
Your role is to suggest possible diagnoses based on presented symptoms.

Rules:
- Provide up to 5 differential diagnoses, ordered by likelihood
- Use ICD-10 codes
- Probabilities are 0.00–1.00
- Be concise but clinically accurate
- Include endemic Philippine conditions when relevant (dengue, TB, typhoid, leptospirosis, etc.)
- Always include a clinical caveat

Respond ONLY with a JSON object in this exact format:
{
  "suggestions": [
    {
      "icdCode": "A90",
      "diagnosis": "Dengue Fever",
      "probability": 0.75,
      "reasoning": "..."
    }
  ],
  "clinicalNote": "One sentence clinical caveat."
}`;

export async function llmDiagnose(
  symptoms: string[],
  age: number | null,
  gender: string | null,
): Promise<DiagnosisSuggestion[] | null> {
  if (!isAIEnabled()) return null;

  const userMsg = [
    `Patient symptoms: ${symptoms.join(', ')}`,
    age   ? `Patient age: ${age} years` : null,
    gender ? `Patient gender: ${gender}` : null,
    `Setting: Philippine hospital context`,
  ].filter(Boolean).join('\n');

  try {
    const text = await claudeRequest(DIAGNOSIS_SYSTEM, [{ role: 'user', content: userMsg }]);
    const parsed = extractJSON(text) as {
      suggestions: Array<{
        icdCode: string;
        diagnosis: string;
        probability: number;
        reasoning: string;
      }>;
    };

    if (!Array.isArray(parsed.suggestions)) return null;

    return parsed.suggestions.slice(0, 5).map((s) => ({
      icdCode:     s.icdCode     ?? 'R00',
      diagnosis:   s.diagnosis   ?? 'Unknown',
      probability: typeof s.probability === 'number' ? Math.min(1, Math.max(0, s.probability)) : 0.5,
      reasoning:   s.reasoning   ?? '',
    }));
  } catch (err) {
    console.error('[AI] llmDiagnose error:', err);
    return null;
  }
}

// ── Drug Interactions ─────────────────────────────────────────────────────────

const INTERACTION_SYSTEM = `You are a clinical pharmacist AI assistant.
Analyze the provided list of medications for clinically significant drug interactions.

Rules:
- Only report interactions with clinical significance (MODERATE, MAJOR, or CONTRAINDICATED)
- Be specific about the mechanism and clinical consequence
- Do NOT report every theoretical interaction — focus on actionable ones

Respond ONLY with a JSON object:
{
  "interactions": [
    {
      "drug1": "warfarin",
      "drug2": "aspirin",
      "severity": "MAJOR",
      "description": "..."
    }
  ],
  "summary": "One sentence summary of overall interaction risk."
}`;

export async function llmCheckInteractions(
  medicationNames: string[],
): Promise<DrugInteractionResult[] | null> {
  if (!isAIEnabled() || medicationNames.length < 2) return null;

  const userMsg = `Check drug interactions for these medications:\n${medicationNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;

  try {
    const text = await claudeRequest(INTERACTION_SYSTEM, [{ role: 'user', content: userMsg }]);
    const parsed = extractJSON(text) as {
      interactions: Array<{
        drug1: string;
        drug2: string;
        severity: string;
        description: string;
      }>;
    };

    if (!Array.isArray(parsed.interactions)) return null;

    return parsed.interactions.map((i) => ({
      drug1:       i.drug1       ?? '',
      drug2:       i.drug2       ?? '',
      severity:    i.severity    ?? 'MODERATE',
      description: i.description ?? '',
    }));
  } catch (err) {
    console.error('[AI] llmCheckInteractions error:', err);
    return null;
  }
}

// ── Vital Signs Narrative ─────────────────────────────────────────────────────

const VITALS_SYSTEM = `You are a clinical nurse educator AI.
Given a set of vital sign alerts for a patient, generate a concise clinical summary
and prioritized nursing action plan.

Be practical and specific. Focus on immediate actions.

Respond ONLY with a JSON object:
{
  "clinicalSummary": "2-3 sentence summary of the patient's current clinical status.",
  "priorityActions": ["Action 1", "Action 2", "Action 3"],
  "urgencyLevel": "ROUTINE|URGENT|EMERGENT"
}`;

export async function llmVitalSignsNarrative(
  alerts: Array<{ parameter: string; value: string; status: string; recommendation: string }>,
  patientAge?: number,
): Promise<{ clinicalSummary: string; priorityActions: string[]; urgencyLevel: string } | null> {
  if (!isAIEnabled() || alerts.length === 0) return null;

  const alertsText = alerts
    .map(a => `${a.parameter}: ${a.value} [${a.status}] — ${a.recommendation}`)
    .join('\n');

  const userMsg = [
    patientAge ? `Patient age: ${patientAge} years` : null,
    `Vital sign alerts:\n${alertsText}`,
  ].filter(Boolean).join('\n');

  try {
    const text = await claudeRequest(VITALS_SYSTEM, [{ role: 'user', content: userMsg }]);
    const parsed = extractJSON(text) as {
      clinicalSummary:  string;
      priorityActions:  string[];
      urgencyLevel:     string;
    };

    return {
      clinicalSummary: parsed.clinicalSummary  ?? '',
      priorityActions: Array.isArray(parsed.priorityActions) ? parsed.priorityActions : [],
      urgencyLevel:    parsed.urgencyLevel     ?? 'ROUTINE',
    };
  } catch (err) {
    console.error('[AI] llmVitalSignsNarrative error:', err);
    return null;
  }
}
