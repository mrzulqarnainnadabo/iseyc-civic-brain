/**
 * Published-only public records proxy for Civic Brain UI.
 * Server-side fetch of Civic Mandate /api/pulse. Allowlist DTO only.
 */
import { voicesToPublicMandateRecords, PUBLIC_MANDATE_SCHEMA_VERSION } from '../lib/public-mandate-record.js';

const PULSE_URL =
  process.env.CIVIC_MANDATE_PULSE_URL ||
  'https://2027-street-mandate.vercel.app/api/pulse';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const r = await fetch(PULSE_URL, { headers: { Accept: 'application/json' } });
    if (!r.ok) {
      res.status(503).json({
        error: 'PUBLIC_RECORDS_UNAVAILABLE',
        message: 'Published Civic Mandate records could not be loaded.',
      });
      return;
    }
    const data = await r.json();
    if (data?.error || !Array.isArray(data?.voices)) {
      res.status(503).json({
        error: 'PUBLIC_RECORDS_MALFORMED',
        message: 'Published records response was incomplete.',
      });
      return;
    }
    const records = voicesToPublicMandateRecords(data.voices);
    res.status(200).json({
      schemaVersion: PUBLIC_MANDATE_SCHEMA_VERSION,
      version: PUBLIC_MANDATE_SCHEMA_VERSION,
      source: 'civic-mandate-pulse-published-only',
      generatedAt: new Date().toISOString(),
      total: typeof data.total === 'number' ? data.total : records.length,
      states: data.states ?? null,
      truncated: Boolean(data.truncated),
      records,
      limitations: [
        'Published records only after human ISEYC review.',
        'Pilot coverage — not a representative national survey.',
        'Counts are published records in this dataset, not prevalence of need.',
        'Named office is as recorded on the public record, not a legal determination.',
      ],
    });
  } catch {
    res.status(503).json({
      error: 'PUBLIC_RECORDS_UNAVAILABLE',
      message: 'Published Civic Mandate records could not be loaded.',
    });
  }
}
