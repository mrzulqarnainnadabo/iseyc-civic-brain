import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compactNarrative } from '../lib/response-length.js';

const prompt = fs.readFileSync('lib/system-prompt.js', 'utf8');
const api = fs.readFileSync('api/chat.js', 'utf8');
const engine = fs.readFileSync('lib/civic-brief-engine.js', 'utf8');
const ui = fs.readFileSync('src/components/EvidenceWorkspace.jsx', 'utf8');

assert.match(prompt, /Default to 45–90 words/);
assert.match(prompt, /Hard limit: 120 words/);
assert.doesNotMatch(prompt, /Use these four headings exactly and in this order/);
assert.doesNotMatch(prompt, /Always use the four required CIVIC BRIEF headings/);
assert.match(api, /const MAX_OUTPUT_TOKENS = 256;/);
assert.match(api, /compactNarrative\(result\.text\)/);
assert.match(api, /const MAX_BRIEF_OUTPUT_TOKENS = 2600;/);

const longResponse = Array.from({ length: 40 }, (_, index) => 'Finding ' + (index + 1) + ' is supported by the published source.').join(' ');
const compactResponse = compactNarrative(longResponse);
assert.ok(compactResponse.trim().split(/\s+/).length <= 120, 'narrative response must stay within 120 words');
assert.ok(compactResponse.endsWith('.'), 'length guard must stop at a complete sentence when possible');
assert.ok(compactResponse.includes('Finding 1') && !compactResponse.includes('Finding 40'));
assert.equal(compactNarrative('A concise answer.'), 'A concise answer.');
assert.equal(compactNarrative(''), '');

assert.match(engine, /executiveSummary/);
assert.match(engine, /recommendations/);
assert.match(ui, /Evidence and source notes/);
assert.match(ui, /Verified national source observations/);
assert.match(ui, /<details/);
assert.match(ui, /Data reconciliation/);
console.log('Civic Brain concise-response and progressive-disclosure checks passed.');
