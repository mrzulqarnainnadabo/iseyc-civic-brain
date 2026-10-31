/**
 * Published-only public records proxy — allowlist + safe upstream.
 */
import { voicesToPublicRecords } from '../lib/public-mandate-dto.js';
import { safeFetchJson, buildMandatePublicUrl, validatePublicHttpsUrl } from '../lib/safe-fetch.js';

const DEFAULT_PULSE = 'https://2027-street-mandate.vercel.app/api/pulse';

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

  const pulseUrl = (process.env.CIVIC_MANDATE_PULSE_URL || DEFAULT_PULSE).trim();
  const urlCheck = validatePublicHttpsUrl(pulseUrl);
  if (!urlCheck.ok) {
    res.status(503).json({
      error: 'PUBLIC_RECORDS_MISCONFIGURED',
      message: 'Pulse URL is not an approved HTTPS host.',
    });
    return;
  }

  try {
    const result = await safeFetchJson(pulseUrl);
    if (!result.ok) {
      res.status(503).json({
        error: 'PUBLIC_RECORDS_UNAVAILABLE',
        message: 'Published Civic Mandate records could not be loaded.',
        detail: result.error,
      });
      return;
    }
    const data = result.data;
    if (data?.error || !Array.isArray(data?.voices)) {
      res.status(503).json({
        error: 'PUBLIC_RECORDS_MALFORMED',
        message: 'Published records response was incomplete.',
      });
      return;
    }
    const records = voicesToPublicRecords(data.voices).map((rec) => ({
      ...rec,
      publicUrl: buildMandatePublicUrl(rec.id) || rec.publicUrl,
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
  } catch {
    res.status(503).json({
      error: 'PUBLIC_RECORDS_UNAVAILABLE',
      message: 'Published Civic Mandate records could not be loaded.',
    });
  }
}
