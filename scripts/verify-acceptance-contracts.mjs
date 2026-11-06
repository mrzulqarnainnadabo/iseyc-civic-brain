/**
 * Acceptance contracts for Civic Brain (automated — not live LLM).
 * Maps the five founder scenarios to deterministic checks.
 */
import { readFileSync } from 'fs';
import { routeMandate } from '../lib/routing-engine.js';
import { SERVER_SYSTEM_PROMPT } from '../lib/system-prompt.js';
import { sanitizeSnapshot, formatEvidenceBlock } from '../lib/civic-evidence.js';
import { redactSensitive } from '../lib/redact.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK:', msg);
  }
}

const headerNav = readFileSync(new URL('../src/components/ui/Header.jsx', import.meta.url), 'utf8');
const footerNav = readFileSync(new URL('../src/components/ui/Footer.jsx', import.meta.url), 'utf8');
const canonicalObservatory = 'https://iseyc-civic-intelligence-observatory.vercel.app';
for (const [label, source] of [['header', headerNav], ['footer', footerNav]]) {
  assert(source.includes(canonicalObservatory), `${label} uses canonical Observatory hostname`);
  assert(!source.includes('iseyc-civic-intelligence-observator.vercel.app'), `${label} excludes misspelled Observatory hostname`);
  for (const department of ['education', 'health', 'software-technology', 'civic']) {
    assert(source.includes(department), `${label} links ${department} department`);
  }
}

const prompt = SERVER_SYSTEM_PROMPT.toLowerCase();

const snap = sanitizeSnapshot({
  version: '1.0.0',
  generatedAt: '2026-10-18T00:00:00.000Z',
  publishedCount: 21,
  statesRepresented: 2,
  lgasRepresented: 7,
  dutiesRepresented: 9,
  truncated: false,
  duties: [{ duty: 'Health', count: 5, shareOfPublished: 0.238 }],
  states: [{ state: 'Kaduna', count: 20, shareOfPublished: 0.952 }],
  offices: [],
  topLgas: [{ state: 'Kaduna', lga: 'Kaduna South', count: 12 }],
  methodology: ['Only records with Status = Published'],
  limitations: ['Not a statistically representative survey'],
  framingLine: 'Among 21 published Civic Mandate records from 2 states…',
});
const block = formatEvidenceBlock(snap);
assert(block.includes('PRIMARY_SOURCE'), 'S1 evidence block carries primary source label');
assert(block.includes('Published records: 21'), 'S1 published count present');
assert(block.includes('Health'), 'S1 Health duty present');
assert(block.includes('Kaduna'), 'S1 Kaduna present');
assert(block.toLowerCase().includes('not national') || block.includes('not national public opinion'), 'S1 not-national-opinion label');
const rHealth = routeMandate({
  duty: 'Health',
  mandateText: 'Every public primary health centre in Kaduna South stocked with essential medicines',
  state: 'Kaduna',
  lga: 'Kaduna South',
});
assert(rHealth.status === 'needs_review' || rHealth.primary, 'S1 routing yields reviewable primary for Health+Kaduna');
assert(rHealth.status !== 'confident_final' && rHealth.status !== 'sent', 'S1 not auto-final/sent');

assert(
  prompt.includes('invent') || prompt.includes('do not invent') || block.includes('unavailable'),
  'S2 prompt/evidence forbid inventing unsupported national figures'
);
assert(prompt.includes('not') && prompt.includes('representative'), 'S2 non-representativeness in prompt');

const rAmb = routeMandate({ duty: 'Health', mandateText: 'PHC medicines', state: '' });
assert(rAmb.status === 'insufficient_information', 'S3 health without state => insufficient_information');
assert(!rAmb.primary, 'S3 no confident primary without state');

assert(prompt.includes('phone') || prompt.includes('private'), 'S4 prompt addresses private contact refusal');
assert(prompt.includes('refuse') || prompt.includes('do not claim access'), 'S4 refusal language present');
const red = redactSensitive('Call me on 08031234567 or name@example.com about mandate 12345678901');
assert(red.includes('[REDACTED_PHONE]'), 'S4 redact phone');
assert(red.includes('[REDACTED_EMAIL]'), 'S4 redact email');

assert(prompt.includes('resolved') || prompt.includes('resolution'), 'S5 resolution claim guard in prompt');
assert(prompt.includes('not resolution') || prompt.includes('verification'), 'S5 resolution vs verification distinction');

const chatSrc = readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');
assert(chatSrc.includes('SERVER_SYSTEM_PROMPT'), 'chat uses server prompt');
assert(chatSrc.includes('fetchCivicIntelligence'), 'chat retrieves mandate evidence');


assert(prompt.includes('no candidate rankings') && prompt.includes('endorsements'), 'refuses candidate and party ranking or endorsement requests');
assert(prompt.includes('never invent counts') || prompt.includes('never invent') || prompt.includes('do not invent counts'), 'refuses unsupported statistics');
assert(prompt.includes('empty or unavailable') && prompt.includes('say that precisely'), 'empty and unavailable evidence must be disclosed honestly');
assert(prompt.includes('never claim to have contacted') && prompt.includes('sent a referral'), 'never claims a referral was sent');

const markdownSrc = readFileSync(new URL('../src/components/Markdown.jsx', import.meta.url), 'utf8');
assert(markdownSrc.includes('function inline'), 'Markdown uses a dedicated inline formatter');
assert(markdownSrc.includes('startsWith("```")'), 'Markdown renders fenced code blocks');
assert(markdownSrc.includes('safeHref') && markdownSrc.includes("url.protocol === 'https:'"), 'Markdown links allow HTTPS only');
assert(markdownSrc.includes('<ol') && markdownSrc.includes('<ul'), 'Markdown renders ordered and unordered lists');
assert(markdownSrc.includes('<blockquote'), 'Markdown renders blockquotes');
assert(!markdownSrc.includes('dangerouslySetInnerHTML'), 'Markdown does not inject raw HTML');

assert(chatSrc.includes('const system = [') && chatSrc.includes('SERVER_SYSTEM_PROMPT'), 'server composes system instructions from server-owned prompt');
assert(chatSrc.includes('validateChatBody(req.body)'), 'chat validates client payload before provider call');
assert(!/req\.body\s*\.\s*system/.test(chatSrc), 'chat does not accept a client-owned system prompt');

if (failed) {
  console.error(`\n${failed} acceptance contract(s) failed`);
  process.exit(1);
}
console.log('\nverify-acceptance-contracts: PASS');
