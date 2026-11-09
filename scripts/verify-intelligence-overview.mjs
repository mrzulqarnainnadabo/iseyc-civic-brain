import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync('api/intelligence-overview.js', 'utf8');
const view = fs.readFileSync('src/components/IntelligenceOverview.jsx', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');
const header = fs.readFileSync('src/components/ui/Header.jsx', 'utf8');

for (const token of [
  'fetchPublishedCommunityRecords',
  'fetchPublishedCommunityObservations',
  'fetchInecEvidence',
  'fetchIndicatorCatalog',
  'Promise.allSettled',
  'AbortSignal.timeout(9000)',
  'systemBoundary',
  'publishedCommunityRecords',
  'communityObservations',
  'officialElectoralEvidence',
  'nationalIndicators',
]) assert.ok(route.includes(token), 'overview API must expose ' + token);

for (const token of [
  'Published civic records',
  'Community observations',
  'INEC evidence datasets',
  'National indicators',
  'From public signal to accountable understanding',
  'Ask the intelligence desk',
  'Evidence discipline',
  'Civic Mandate Nigeria',
  'Civic Intelligence Observatory',
  'Department intelligence',
  'Education & Capacity',
  'Health & Well-being',
  'Software & Technology',
  'Civic Affairs',
  'statusLabel',
]) assert.ok(view.includes(token), 'overview UI must include ' + token);

assert.match(app, /useState\("overview"\)/);
assert.match(app, /tab === "overview"/);
assert.match(app, /initialPrompt=\{initialPrompt\}/);
for (const token of ['overview', 'evidence', 'routing']) assert.ok(header.includes('id: "' + token + '"'), 'header must expose ' + token);
assert.ok(!view.includes('2,783,731'), 'dashboard must not hardcode changing source totals');
assert.ok(!view.includes('100% connected'), 'dashboard must not claim unsupported system completeness');
assert.ok(!route.includes('fetchCivicIntelligence'), 'overview must not add an unbounded duplicate snapshot request');
console.log('Civic Brain intelligence overview contracts passed.');
