import { routeMandate } from '../lib/routing-engine.js';
import { canTransition, SAFE_AUTOMATED_STAGES } from '../lib/referral-lifecycle.js';
import { OFFICE_REGISTRY, getOfficeById } from '../lib/office-registry.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; }
  else console.log('OK:', msg);
}

assert(OFFICE_REGISTRY.every((o) => o.holdsOfficeholderIdentity === false), 'registry has no officeholder identities');

const kwOnly = routeMandate({ duty: 'Health', mandateText: 'need medicines' });
assert(kwOnly.status === 'insufficient_information' || kwOnly.status === 'needs_review', 'health without state is not a confident final route');
assert(!kwOnly.primary || kwOnly.primary.confidence !== 'high', 'no high confidence without jurisdiction');

const healthKd = routeMandate({ duty: 'Health', state: 'Kaduna', lga: 'Kaduna South', mandateText: 'PHC stocked with essential medicines' });
assert(healthKd.primary?.officeId === 'state-governor' || healthKd.additional.some((a) => a.officeId === 'state-governor'), 'health+state surfaces governor');
assert(healthKd.humanReviewRequired === true, 'human review always required');
assert(healthKd.externalDeliveryAllowed === false, 'no external delivery in pilot');

const fedRoad = routeMandate({ duty: 'Roads & Transport', state: 'Kaduna', roadClass: 'federal', mandateText: 'Federal highway washed away' });
assert(fedRoad.primary?.officeId === 'fed-president' || fedRoad.additional.some((a) => a.officeId === 'fed-president'), 'federal road class surfaces federal executive');

const sec = routeMandate({ duty: 'Security', state: 'Kaduna', mandateText: 'neighbourhood response' });
assert(!sec.primary || sec.primary.officeId !== 'fed-vp', 'VP is not primary for security');
assert(!sec.additional.some((a) => a.officeId === 'fed-vp'), 'VP not in security candidates by default');

const vp = routeMandate({ duty: 'Security', state: 'Kaduna', vpDelegatedRoleDocumented: true, mandateText: 'coordination role' });
assert(vp.additional.some((a) => a.officeId === 'fed-vp') || vp.primary?.officeId === 'fed-vp', 'VP appears only when delegated flag set');

const empty = routeMandate({});
assert(empty.status === 'insufficient_information', 'empty input insufficient');

const gate = canTransition('routing_recommendation', 'referral_sent', { actorRole: 'model', hasEvidence: true, consentRecorded: true });
assert(gate.ok === false, 'model cannot mark referral_sent');

assert(SAFE_AUTOMATED_STAGES.has('routing_recommendation'), 'routing_recommendation is safe automated');
assert(!SAFE_AUTOMATED_STAGES.has('referral_sent'), 'referral_sent is not safe automated');
assert(getOfficeById('fed-president'), 'president in registry');

if (failed) { console.error(failed + ' routing checks failed'); process.exit(1); }
console.log('\nverify-routing: PASS');
