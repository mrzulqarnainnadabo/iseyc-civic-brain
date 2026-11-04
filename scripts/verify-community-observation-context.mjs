import assert from 'node:assert/strict';
import fs from 'node:fs';

const chat = fs.readFileSync('api/chat.js', 'utf8');
const prompt = fs.readFileSync('lib/system-prompt.js', 'utf8');
const client = fs.readFileSync('lib/community-observation-client.js', 'utf8');

assert.match(chat, /fetchPublishedCommunityObservations/);
assert.match(chat, /formatCommunityObservationBlock/);
assert.match(chat, /CURRENT COMMUNITY OBSERVATIONS/);
assert.match(chat, /communityObservations: observationMeta/);
assert.match(chat, /Promise\.allSettled/);

assert.match(prompt, /Community Observations are a separate published report stream/);
assert.match(prompt, /This is editorial review, not independent verification/);
assert.match(prompt, /Do not treat report volume as prevalence/);
assert.match(prompt, /Do not use national indicators to verify a named state/);

assert.match(client, /PUBLIC_KEYS/);
assert.match(client, /publicationBoundary !== 'published-only'/);
assert.match(client, /No substitute records are used/);
assert.doesNotMatch(client, /fetchPulse|fromPulseVoice/);

console.log('verify-community-observation-context: PASS');
