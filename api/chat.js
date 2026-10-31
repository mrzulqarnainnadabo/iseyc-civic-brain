/**
 * Chat — validated brief rendering via buildStructuredBriefResponse; no raw model leakage.
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
  buildStructuredBriefResponse,
  buildNarrativeResponse,
} from '../lib/civic-brief-response.js';
import { briefModeSystemAppendix } from '../lib/civic-brief-engine.js';

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

  const evidenceController = new AbortController();
  const evidenceTimer = setTimeout(() => evidenceController.abort(), 8000);

  let evidenceBlock = '[Aggregate evidence unavailable.]';
  let recordBlock = '[Published records unavailable.]';
  let evidenceMeta = { ok: false };
  let recordsMeta = { ok: false, count: 0 };
  let pulse = { error: 'not_loaded', records: [] };
  let snap = { error: 'not_loaded' };

  try {
    const pulseP = fetchPublishedRecords(evidenceController.signal)
      .then((r) => ({ ok: !r.error, data: r }))
      .catch((e) => ({ ok: false, data: { error: e?.message || 'PULSE_ERROR', records: [] } }));
    const intelP = fetchCivicIntelligence(evidenceController.signal)
      .then((r) => ({ ok: !r.error, data: r }))
      .catch((e) => ({ ok: false, data: { error: e?.message || 'INTEL_ERROR' } }));
    const [pulseRes, intelRes] = await Promise.all([pulseP, intelP]);

    if (intelRes.ok && intelRes.data && !intelRes.data.error) {
      snap = intelRes.data;
      evidenceBlock = formatEvidenceBlock(snap);
      evidenceMeta = { ok: true, publishedCount: snap.publishedCount, generatedAt: snap.generatedAt };
    } else {
      evidenceMeta = { ok: false, reason: intelRes.data?.error || 'unavailable' };
      evidenceBlock =
        '[Aggregate unavailable (' + (evidenceMeta.reason || 'error') + '). Do not invent counts.]';
    }
    if (pulseRes.ok && pulseRes.data && !pulseRes.data.error && pulseRes.data.records?.length) {
      pulse = pulseRes.data;
      recordBlock = formatRecordEvidenceBlock(pulse);
      recordsMeta = { ok: true, count: pulse.records.length, total: pulse.total };
    } else {
      recordsMeta = { ok: false, count: 0, reason: pulseRes.data?.error || 'empty' };
      recordBlock =
        '[Records unavailable (' + (recordsMeta.reason || 'error') + '). Do not invent ids.]';
      pulse = pulseRes.data || { error: 'unavailable', records: [] };
    }
  } finally {
    clearTimeout(evidenceTimer);
  }

  const trustedRegistry = buildTrustedRegistry(
    recordsMeta.ok ? pulse : { error: recordsMeta.reason || 'unavailable', records: [] },
    evidenceMeta.ok ? snap : { error: evidenceMeta.reason || 'unavailable' }
  );

  const system = [
    SERVER_SYSTEM_PROMPT,
    modeHint,
    '',
    '=== AGGREGATE ===',
    evidenceBlock,
    '',
    '=== RECORDS ===',
    recordBlock,
    '=== END ===',
    'Cite only server ids. Never invent aggregate numbers or independent verification.',
    briefMode ? briefModeSystemAppendix() : '',
  ].join('\n');

  const providers = [];
  if (process.env.GROQ_API_KEY) providers.push((sig) => callGroq(process.env.GROQ_API_KEY, messages, system, sig));
  if (process.env.ANTHROPIC_API_KEY)
    providers.push((sig) => callAnthropic(process.env.ANTHROPIC_API_KEY, messages, system, sig));
  if (process.env.XAI_API_KEY) providers.push((sig) => callXAI(process.env.XAI_API_KEY, messages, system, sig));
  if (!providers.length) {
    return res.status(503).json({ error: 'NO_PROVIDER', message: 'No AI provider configured.' });
  }

  const lastUser = messages[messages.length - 1]?.content || '';
  for (const run of providers) {
    const providerController = new AbortController();
    const providerTimer = setTimeout(() => providerController.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const result = await run(providerController.signal);
      if (!result.ok) continue;

      if (!briefMode) {
        const body = buildNarrativeResponse(result.text, trustedRegistry.aggregateMeta);
        return res.status(200).json({
          ...body,
          provider: result.provider,
          model: result.model,
          evidence: evidencePayload(evidenceMeta, recordsMeta, trustedRegistry),
        });
      }

      const body = buildStructuredBriefResponse(result.text, trustedRegistry, lastUser, {
        aggregateAvailable: evidenceMeta.ok,
        recordsAvailable: recordsMeta.ok,
      });
      return res.status(200).json({
        ...body,
        provider: result.provider,
        model: result.model,
        evidence: evidencePayload(evidenceMeta, recordsMeta, trustedRegistry),
      });
    } catch (err) {
      console.error('Provider path error:', err?.name || 'provider_error');
    } finally {
      clearTimeout(providerTimer);
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

async function callGroq(apiKey, messages, system, signal) {
  const openAIMessages = [{ role: 'system', content: system }];
  for (const m of messages) openAIMessages.push({ role: m.role, content: m.content });
  for (const model of GROQ_MODELS) {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model, messages: openAIMessages, max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.4 }),
      signal,
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

async function callAnthropic(apiKey, messages, system, signal) {
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
    signal,
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

async function callXAI(apiKey, messages, system, signal) {
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
    signal,
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
