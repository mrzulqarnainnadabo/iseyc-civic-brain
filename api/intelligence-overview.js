import { fetchPublishedCommunityRecords } from '../lib/community-record-client.js';
import { fetchPublishedCommunityObservations } from '../lib/community-observation-client.js';
import { fetchInecEvidence } from '../lib/inec-evidence-client.js';

const OBSERVATORY = 'https://iseyc-civic-intelligence-observatory.vercel.app';

function safeStatus(value) {
  return ['ready', 'partial', 'empty', 'unavailable', 'invalid', 'incomplete', 'skipped'].includes(value)
    ? value : 'unavailable';
}

const timedFetch = (input, init = {}) => fetch(input, { ...init, signal: AbortSignal.timeout(9000) });

async function fetchIndicatorCatalog() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(OBSERVATORY + '/api/evidence/observations?catalog=1', {
      headers: { Accept: 'application/json' }, signal: controller.signal,
    });
    if (!response.ok) return { status: 'unavailable', indicators: [] };
    const body = await response.json();
    if (!Array.isArray(body?.indicators)) return { status: 'invalid', indicators: [] };
    return {
      status: body.indicators.length ? 'ready' : 'empty',
      indicators: body.indicators.map((item) => ({
        id: String(item.id || ''),
        title: String(item.title || 'Untitled indicator'),
        publisher: String(item.sourcePublisher || 'Source not stated'),
        geoLevel: String(item.geoLevel || 'unknown'),
        sourceUrl: typeof item.sourceUrl === 'string' ? item.sourceUrl : null,
      })).filter((item) => item.id),
    };
  } catch {
    return { status: 'unavailable', indicators: [] };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const results = await Promise.allSettled([
    fetchPublishedCommunityRecords(timedFetch),
    fetchPublishedCommunityObservations(timedFetch, { timeoutMs: 9000 }),
    fetchInecEvidence('Nigeria voter register PVC collection and Continuous Voter Registration', timedFetch, { timeoutMs: 6000 }),
    fetchIndicatorCatalog(),
  ]);
  const value = (index) => results[index].status === 'fulfilled' ? results[index].value : null;
  const records = value(0);
  const observations = value(1);
  const inec = value(2);
  const indicators = value(3);

  const communityReady = Boolean(records && Array.isArray(records.records));
  const observationStatus = safeStatus(observations?.status);
  const inecStatus = safeStatus(inec?.status);
  const indicatorStatus = safeStatus(indicators?.status);

  res.status(200).json({
    contractVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    coverage: {
      publishedCommunityRecords: {
        status: communityReady ? (records.records.length ? 'ready' : 'empty') : 'unavailable',
        total: communityReady ? records.total : null,
        loaded: communityReady ? records.records.length : 0,
        source: communityReady ? records.source : 'unavailable',
        fallback: communityReady ? Boolean(records.fallbackReason) : false,
        truncated: communityReady ? records.truncated : null,
        limitations: communityReady ? records.limitations : ['Published Civic Mandate records are currently unavailable.'],
      },
      communityObservations: {
        status: observationStatus,
        total: typeof observations?.total === 'number' ? observations.total : null,
        source: observations?.source || 'unavailable',
        limitations: Array.isArray(observations?.limitations) ? observations.limitations : [],
      },
      officialElectoralEvidence: {
        status: inecStatus,
        datasets: Array.isArray(inec?.datasets) ? inec.datasets.map((dataset) => ({
          id: dataset.datasetId,
          title: dataset.title,
          referenceDate: dataset.sourceReferenceDate || null,
          recordCount: Array.isArray(dataset.records) ? dataset.records.length : 0,
          sourceUrl: dataset.sourceUrl,
        })) : [],
        limitations: Array.isArray(inec?.limitations) ? inec.limitations : [],
      },
      nationalIndicators: {
        status: indicatorStatus,
        count: Array.isArray(indicators?.indicators) ? indicators.indicators.length : null,
        indicators: Array.isArray(indicators?.indicators) ? indicators.indicators : [],
        note: 'Indicator catalog availability does not mean every series has a current observation.',
      },
    },
    systemBoundary: [
      'Published community records are not representative survey results.',
      'Community observations are reports, not official administrative evidence unless separately corroborated.',
      'INEC datasets are transcriptions of cited official publications, not a live INEC API.',
      'National indicators cannot establish state, LGA, ward or facility conditions.',
      'A published demand, evidence retrieval or routing recommendation does not mean an institution was contacted or an issue was resolved.',
    ],
  });
}
