/**
 * Chat endpoint — independent evidence fetches + trusted registry validation.
 */
import { SERVER_SYSTEM_PROMPT, MODE_HINTS } from '../lib/system-prompt.js';
import { validateChatBody } from '../lib/request-validate.js';
import { checkRateLimit } from '../lib/rate-limit.js';
import {
  fetchCivicIntelligence,
  formatEvidenceBlock,
  fetchPublishedRecords,
  formatRecordEvidenceBlock,
} from '../lib/civic-evidence.js';
import { buildTrustedRegistry } from '../lib/trusted-evidence-registry.js';
import {
  briefModeSystemAppendix,
  extractJsonBrief,
  validateCivicBrief,
  narrativeFallbackFromFailure,
} from '../lib/civic-brief-engine.js';

const PROVIDER_TIMEOUT_MS = 25000;
const MAX_OUTPUT_TOKENS = 1024;
const GROQ_MODELS = ['openai/gpt-oss-120b', 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];

function setCors(res, req) {
  const allowed = (process.env.CIVIC_BRAIN_ALLOWED_ORIGIN || '').trim();
  const origin = req.headers?.origin || '';
  if (allowed && origin === allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
  } else if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function clientIp(req) {
  const xf = req.headers?.['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim().slice(0, 64);
  return req.socket?.remoteAddress || 'unknown';
}

async function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(label + '_TIMEOUT')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

/** Fail independently — never treat failure as empty verified data. */
async function loadEvidenceChannels() {
  const pulseP = fetchPublishedRecords()
    .then((r) => ({ ok: !r.error, data: r }))
    .catch((e) => ({ ok: false, data: { error: e?.message || 'PULSE_FETCH_ERROR', records: [] } }));
  const intelP = fetchCivicIntelligence()
    .then((r) => ({ ok: !r.error, data: r }))
    .catch((e) => ({ ok: false, data: { error: e?.message || 'INTEL_FETCH_ERROR' } }));

  const [pulseRes, intelRes] = await Promise.all([pulseP, intelP]);
  return { pulseRes, intelRes };
}

export default async function handler(req, res) {
  setCors(res, req);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rl = checkRateLimit(clientIp(req));
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfterSec || 60));
    return res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many requests.' });
  }

  const validation = validateChatBody(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.code, message: validation.message });
  }
  const { messages, mode, format } = validation.value;
  const briefMode = format === 'civic_brief_v1';
  const modeHint = MODE_HINTS[mode] || MODE_HINTS.civic;

  let evidenceBlock = '[Aggregate evidence unavailable.]';
  let recordBlock = '[Published records unavailable.]';
  let evidenceMeta = { ok: false };
  let recordsMeta = { ok: false, count: 0 };
  let pulse = { error: 'not_loaded', records: [] };
  let snap = { error: 'not_loaded' };

  try {
    const { pulseRes, intelRes } = await withTimeout(loadEvidenceChannels(), 9000, 'EVIDENCE');
    if (intelRes.ok && intelRes.data && !intelRes.data.error) {
      snap = intelRes.data;
      evidenceBlock = formatEvidenceBlock(snap);
      evidenceMeta = {
        ok: true,
        publishedCount: snap.publishedCount,
        generatedAt: snap.generatedAt,
        version: snap.version,
      };
    } else {
      evidenceMeta = { ok: false, reason: intelRes.data?.error || 'unavailable' };
      evidenceBlock =
        '[Aggregate evidence unavailable (' +
        (evidenceMeta.reason || 'error') +
        '). Do not invent counts.]';
    }
    if (pulseRes.ok && pulseRes.data && !pulseRes.data.error && pulseRes.data.records?.length) {
      pulse = pulseRes.data;
      recordBlock = formatRecordEvidenceBlock(pulse);
      recordsMeta = { ok: true, count: pulse.records.length, total: pulse.total };
    } else {
      recordsMeta = { ok: false, count: 0, reason: pulseRes.data?.error || 'empty' };
      recordBlock =
        '[Published records unavailable (' +
        (recordsMeta.reason || 'error') +
        '). Do not invent record ids.]';
      pulse = pulseRes.data || { error: 'unavailable', records: [] };
    }
  } catch (e) {
    evidenceMeta = { ok: false, reason: e?.message || 'fetch_error' };
    recordsMeta = { ok: false, count: 0, reason: e?.message || 'fetch_error' };
  }

  const trustedRegistry = buildTrustedRegistry(
    recordsMeta.ok ? pulse : { error: recordsMeta.reason || 'unavailable', records: [] },
    evidenceMeta.ok ? snap : { error: evidenceMeta.reason || 'unavailable' }
  );

  const systemParts = [
    SERVER_SYSTEM_PROMPT,
    modeHint,
    '',
    '=== AGGREGATE EVIDENCE ===',
    evidenceBlock,
    '',
    '=== PUBLISHED RECORDS ===',
    recordBlock,
    '=== END ===',
    'Cite only server evidence ids. Never invent aggregate numbers or independent verification.',
  ];
  if (briefMode) systemParts.push('', briefModeSystemAppendix());
  const system = systemParts.join('\n');

  const providers = [];
  if (process.env.GROQ_API_KEY) providers.push(() => callGroq(process.env.GROQ_API_KEY, messages, system));
  if (process.env.ANTHROPIC_API_KEY)
    providers.push(() => callAnthropic(process.env.ANTHROPIC_API_KEY, messages, system));
  if (process.env.XAI_API_KEY) providers.push(() => callXAI(process.env.XAI_API_KEY, messages, system));
  if (!providers.length) {
    return res.status(503).json({ error: 'NO_PROVIDER', message: 'No AI provider configured.' });
  }

  const lastUser = messages[messages.length - 1]?.content || '';
  for (const run of providers) {
    try {
      const result = await withTimeout(run(), PROVIDER_TIMEOUT_MS, 'PROVIDER');
      if (!result.ok) continue;
      if (!briefMode) {
        return res.status(200).json({
          content: [{ type: 'text', text: result.text }],
          provider: result.provider,
          model: result.model,
          format: 'narrative',
          evidence: evidencePayload(evidenceMeta, recordsMeta, trustedRegistry),
        });
      }
      const parsed = extractJsonBrief(result.text);
      const validated = parsed
        ? validateCivicBrief(parsed, trustedRegistry)
        : { ok: false, errors: ['json_parse_failed'], brief: null };
      if (validated.ok) {
        return res.status(200).json({
          content: [{ type: 'text', text: result.text }],
          brief: validated.brief,
          briefValid: true,
          provider: result.provider,
          model: result.model,
          format: 'civic_brief_v1',
          evidence: evidencePayload(evidenceMeta, recordsMeta, trustedRegistry),
        });
      }
      return res.status(200).json({
        content: [
          {
            type: 'text',
            text: narrativeFallbackFromFailure(
              lastUser,
              validated.errors,
              evidenceMeta.ok || recordsMeta.ok
            ),
          },
        ],
        brief: null,
        briefValid: false,
        briefErrors: validated.errors,
        format: 'narrative_fallback',
        provider: result.provider,
        model: result.model,
        evidence: evidencePayload(evidenceMeta, recordsMeta, trustedRegistry),
      });
    } catch (err) {
      console.error('Provider path error:', err?.message || 'provider_error');
    }
  }
  return res.status(502).json({ error: 'PROVIDER_UNAVAILABLE', message: 'Assistant unavailable.' });
}

function evidencePayload(evidenceMeta, recordsMeta, registry) {
  return {
    aggregateAvailable: evidenceMeta.ok,
    recordsAvailable: recordsMeta.ok,
    publishedCount: evidenceMeta.publishedCount ?? null,
    recordsInContext: recordsMeta.count || 0,
    trustedSourceCount: registry?.sourceCount ?? 0,
    unavailable: registry?.unavailable || [],
  };
}

async function callGroq(apiKey, messages, system) {
  const openAIMessages = [{ role: 'system', content: system }];
  for (const m of messages) openAIMessages.push({ role: m.role, content: m.content });
  for (const model of GROQ_MODELS) {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model, messages: openAIMessages, max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.4 }),
    });
    const raw = await upstream.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!upstream.ok) continue;
    const text = data.choices?.[0]?.message?.content;
    if (text) return { ok: true, text, model: data.model || model, provider: 'groq' };
  }
  return { ok: false, error: 'groq_error', provider: 'groq' };
}

async function callAnthropic(apiKey, messages, system) {
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  const raw = await upstream.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, provider: 'anthropic' };
  }
  if (!upstream.ok) return { ok: false, provider: 'anthropic' };
  const textBlock = data.content?.find((b) => b.type === 'text');
  if (!textBlock?.text) return { ok: false, provider: 'anthropic' };
  return { ok: true, text: textBlock.text, model: data.model || 'claude', provider: 'anthropic' };
}

async function callXAI(apiKey, messages, system) {
  const openAIMessages = [{ role: 'system', content: system }];
  for (const m of messages) openAIMessages.push({ role: m.role, content: m.content });
  const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'grok-3',
      messages: openAIMessages,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
    }),
  });
  const raw = await upstream.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, provider: 'xai' };
  }
  if (!upstream.ok) return { ok: false, provider: 'xai' };
  const text = data.choices?.[0]?.message?.content;
  if (!text) return { ok: false, provider: 'xai' };
  return { ok: true, text, model: data.model || 'grok-3', provider: 'xai' };
}
