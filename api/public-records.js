/**
 * Published-only public records proxy for Civic Brain UI.
 * Strict PublicMandateRecord v1 allowlist — never Notion private fields.
 * Each record includes publicUrl for the Mandate receipt page.
 */
import { voicesToPublicRecords } from '../lib/public-mandate-dto.js';

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
    // voicesToPublicRecords sets publicUrl on each allowlisted record
    const records = voicesToPublicRecords(data.voices).map((rec) => ({
      ...rec,
      publicUrl:
        rec.publicUrl ||
        `https://2027-street-mandate.vercel.app/mandate/${rec.id}`,
    }));
    res.status(200).json({
      version: '1.0.0',
      schema: 'PublicMandateRecord',
      source: 'civic-mandate-pulse-published-only',
      generatedAt: new Date().toISOString(),
      total: typeof data.total === 'number' ? data.total : records.length,
      states: data.states ?? null,
      truncated: Boolean(data.truncated),
      records,
      limitations: [
        'Published records only after human ISEYC review.',
        'Pilot coverage — not a representative national survey.',
        'Named office is as recorded on the public record, not a legal determination.',
        'Allowlisted fields only; private submitter data is never included.',
      ],
    });
  } catch (err) {
    res.status(503).json({
      error: 'PUBLIC_RECORDS_UNAVAILABLE',
      message: 'Published Civic Mandate records could not be loaded.',
    });
  }
}
