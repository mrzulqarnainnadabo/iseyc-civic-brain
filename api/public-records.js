/**
 * Published-only public records proxy for Civic Brain UI.
 * Consumes CommunityRecord v0.1 only; returns unavailable when the contract feed fails.
 * Server-side fetch. Never returns unpublished Notion data.
 * Never invents verification status beyond what the source provides.
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
      version: '1.1.0',
      source: bundle.source,
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
      message: 'Published Civic Mandate records could not be loaded.',
    });
  }
}
