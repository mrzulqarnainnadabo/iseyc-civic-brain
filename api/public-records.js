/**
 * Published-only public records proxy for Civic Brain.
 * Prefers CommunityRecord v0.1; falls back to pulse only on retrieval failure.
 * Exposes source and fallbackReason so consumers can distinguish the primary contract
 * from the legacy compatibility path. Never returns unpublished Notion data.
 */
import { fetchPublishedCommunityRecords } from '../lib/community-record-client.js';

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
    const bundle = await fetchPublishedCommunityRecords();
    res.status(200).json({
      version: '1.2.0',
      source: bundle.source,
      fallbackReason: bundle.fallbackReason || null,
      contractVersion: bundle.contractVersion,
      generatedAt: new Date().toISOString(),
      total: bundle.total,
      states: bundle.states,
      truncated: bundle.truncated,
      records: bundle.records,
      limitations: bundle.limitations,
    });
  } catch (err) {
    res.status(503).json({
      error: err?.code || 'PUBLIC_RECORDS_UNAVAILABLE',
      source: 'unavailable',
      fallbackReason: err?.fallbackReason || 'community_record_and_pulse_unavailable',
      message: 'Published Civic Mandate records could not be loaded.',
    });
  }
}
