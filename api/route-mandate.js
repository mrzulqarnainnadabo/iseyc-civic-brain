/**
 * POST /api/route-mandate — deterministic routing recommendation only.
 * Never sends external referrals. Never deploys.
 */

import { routeMandate } from '../lib/routing-engine.js';
import { createCaseShell, canTransition } from '../lib/referral-lifecycle.js';
import { buildReferralBriefDraft } from '../lib/operator-review.js';
import { checkRateLimit } from '../lib/rate-limit.js';

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

  const rl = checkRateLimit('route:' + clientIp(req));
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfterSec || 60));
    return res.status(429).json({ error: 'RATE_LIMITED' });
  }

  const body = req.body || {};
  if (typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'INVALID_BODY' });
  }

  const mandateText = typeof body.mandateText === 'string' ? body.mandateText.slice(0, 4000) : '';
  const duty = typeof body.duty === 'string' ? body.duty.slice(0, 80) : '';
  if (!mandateText && !duty) {
    return res.status(400).json({ error: 'INPUT_REQUIRED', message: 'Provide mandateText and/or duty.' });
  }

  const blocked = canTransition('routing_recommendation', 'referral_sent', {
    actorRole: 'model',
    hasEvidence: false,
    consentRecorded: false,
  });
  if (blocked.ok) {
    return res.status(500).json({ error: 'LIFECYCLE_GUARD_FAILED' });
  }

  const routing = routeMandate({
    mandateText,
    duty,
    state: typeof body.state === 'string' ? body.state.slice(0, 80) : '',
    lga: typeof body.lga === 'string' ? body.lga.slice(0, 80) : '',
    namedOffice: typeof body.namedOffice === 'string' ? body.namedOffice.slice(0, 120) : '',
    recordId: typeof body.recordId === 'string' ? body.recordId.slice(0, 64) : undefined,
    roadClass: body.roadClass === 'federal' || body.roadClass === 'state' || body.roadClass === 'local' ? body.roadClass : 'unknown',
    vpDelegatedRoleDocumented: Boolean(body.vpDelegatedRoleDocumented),
  });

  const caseShell = createCaseShell({ recordId: body.recordId || null, routing, actorRole: 'system' });

  const referralBriefDraft = buildReferralBriefDraft({
    mandateText,
    duty,
    state: typeof body.state === 'string' ? body.state.slice(0, 80) : '',
    lga: typeof body.lga === 'string' ? body.lga.slice(0, 80) : '',
    routing,
  });

  return res.status(200).json({
    routing,
    case: { caseId: caseShell.caseId, stage: caseShell.stage, audit: caseShell.audit },
    referralBriefDraft,
    governance: {
      externalDeliveryAllowed: false,
      humanReviewRequired: true,
      modelCannotSend: true,
      deployNote: 'No production deploy performed by automation; founder controls Vercel usage.',
      lifecycleNote:
        'Published ≠ referred ≠ delivered ≠ acknowledged ≠ answered ≠ resolved. Recommendation only.',
    },
  });
}
