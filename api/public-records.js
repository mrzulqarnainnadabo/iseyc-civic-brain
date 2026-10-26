/**
 * Published-only public records proxy for Civic Brain UI.
 * Server-side fetch avoids relying on browser CORS alone.
 * Never returns unpublished Notion data.
 */
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
    const records = data.voices.map((v) => ({
      id: v.id,
      sentence: v.sentence,
      duty: v.duty || v.mandate || null,
      office: v.office || null,
      state: v.state || null,
      lga: v.lga || null,
      created: v.created || null,
      publicUrl: `https://2027-street-mandate.vercel.app/mandate/${v.id}`,
    }));
    res.status(200).json({
      version: '1.0.0',
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
      ],
    });
  } catch (err) {
    res.status(503).json({
      error: 'PUBLIC_RECORDS_UNAVAILABLE',
      message: 'Published Civic Mandate records could not be loaded.',
    });
  }
}
