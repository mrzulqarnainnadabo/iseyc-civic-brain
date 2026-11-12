import assert from 'node:assert/strict';
import fs from 'node:fs';

const prompt = fs.readFileSync('lib/system-prompt.js', 'utf8');
const api = fs.readFileSync('api/chat.js', 'utf8');
const engine = fs.readFileSync('lib/civic-brief-engine.js', 'utf8');

assert.match(prompt, /Default to 45–90 words/);
assert.match(prompt, /Hard limit: 120 words/);
assert.match(prompt, /Answer.*Evidence.*Limit/s);
assert.doesNotMatch(prompt, /Use these four headings exactly and in this order/);
assert.match(api, /const MAX_OUTPUT_TOKENS = 384;/);
assert.match(api, /const PROVIDER_TIMEOUT_MS = 20000;/);
assert.match(engine, /\*\*Answer\*\*/);
assert.match(engine, /\*\*Limit\*\*/);
assert.match(engine, /\*\*Next step\*\*/);
console.log('Civic Brain concise-response contracts passed.');
