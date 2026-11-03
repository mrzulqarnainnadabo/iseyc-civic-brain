/**
 * Read-only CommunityRecord consumer for Civic Brain.
 * Prefers Mandate GET /api/v1/community-records; falls back to /api/pulse.
 * Never invents verification or private fields.
 */

export const DEFAULT_COMMUNITY_RECORDS_URL =
  process.env.CIVIC_MANDATE_COMMUNITY_RECORDS_URL ||
  'https://2027-street-mandate.vercel.app/api/v1/community-records';

export const DEFAULT_PULSE_URL =
  process.env.CIVIC_MANDATE_PULSE_URL ||
  'https://2027-street-mandate.vercel.app/api/pulse';

/**
 * Normalize CommunityRecord v0.1 → Brain public record shape.
 */
export function fromCommunityRecord(r) {
  return {
    id: r.id,
    sentence: r.text || '',
    duty: r.duty || null,
    office: r.officeLabel || null,
    state: r.state || null,
    lga: r.lga || null,
    created: r.createdAt || null,
    contractVersion: r.contractVersion || '0.1.0',
    publicationStatus: r.publicationStatus || 'published',
    verificationStatus: r.verificationStatus || 'unverified',
    publicUrl: `https://2027-street-mandate.vercel.app/mandate/${r.id}`,
  };
}

/** Normalize legacy pulse voice → same shape. */
export function fromPulseVoice(v) {
  return {
    id: v.id,
    sentence: v.sentence || '',
    duty: v.duty || v.mandate || null,
    office: v.office || null,
    state: v.state || null,
    lga: v.lga || null,
    created: v.created || null,
    contractVersion: null,
    publicationStatus: 'published',
    verificationStatus: 'unverified',
    publicUrl: `https://2027-street-mandate.vercel.app/mandate/${v.id}`,
  };
}

/**
 * Fetch published community intelligence for Brain.
 * @returns {{ source: string, records: object[], total: number, truncated: boolean|null, states: number|null, contractVersion: string|null }}
 */
export async function fetchPublishedCommunityRecords(fetchImpl = fetch) {
  // Prefer versioned CommunityRecord API
  try {
    const url = new URL(DEFAULT_COMMUNITY_RECORDS_URL);
    url.searchParams.set('page', '1');
    url.searchParams.set('pageSize', '50');
    const r = await fetchImpl(url.toString(), { headers: { Accept: 'application/json' } });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data?.records) && data.contractVersion) {
        const records = data.records.map(fromCommunityRecord);
        return {
          source: 'civic-mandate-community-records-v0.1',
          contractVersion: data.contractVersion,
          records,
          total: typeof data.total === 'number' ? data.total : records.length,
          truncated: Boolean(data.truncatedUpstream),
          states: null,
          limitations: [
            data.verificationNote ||
              'verificationStatus defaults to unverified; publication is not independent verification.',
            data.prevalenceNote ||
              'Published records only — not a measure of national need.',
            'Named office is as recorded on the public record, not a legal determination.',
          ],
        };
      }
    }
  } catch {
    // fall through to pulse
  }

  const r = await fetchImpl(DEFAULT_PULSE_URL, { headers: { Accept: 'application/json' } });
  if (!r.ok) {
    const err = new Error('PUBLIC_RECORDS_UNAVAILABLE');
    err.code = 'PUBLIC_RECORDS_UNAVAILABLE';
    throw err;
  }
  const data = await r.json();
  if (data?.error || !Array.isArray(data?.voices)) {
    const err = new Error('PUBLIC_RECORDS_MALFORMED');
    err.code = 'PUBLIC_RECORDS_MALFORMED';
    throw err;
  }
  const records = data.voices.map(fromPulseVoice);
  return {
    source: 'civic-mandate-pulse-published-only',
    contractVersion: null,
    records,
    total: typeof data.total === 'number' ? data.total : records.length,
    truncated: Boolean(data.truncated),
    states: data.states ?? null,
    limitations: [
      'Published records only after human ISEYC review.',
      'Pilot coverage — not a representative national survey.',
      'Named office is as recorded on the public record, not a legal determination.',
      'Serving legacy pulse shape; CommunityRecord API not yet available.',
    ],
  };
}
