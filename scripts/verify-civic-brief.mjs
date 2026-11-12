import fs from 'node:fs';
import assert from 'node:assert/strict';
import { SERVER_SYSTEM_PROMPT, MODE_HINTS } from '../lib/system-prompt.js';

const prompt = SERVER_SYSTEM_PROMPT;
const workspace = fs.readFileSync('src/components/EvidenceWorkspace.jsx', 'utf8');
const header = fs.readFileSync('src/components/ui/Header.jsx', 'utf8');

for (const required of [
  'https://2027-street-mandate.vercel.app',
  'not a representative national survey',
  'Never invent counts',
  'Do not automatically contact officials',
  'unpublished submissions',
  '53.7% reporting rate',
  'BudgIT\'s Q2 2026 States Fiscal Transparency League',
  '15 official state budget portals',
  '3 additional official state document sources',
  '18 states remain unreviewed',
  '₦621.34 billion',
  '₦614.55 billion',
  'The ₦6.79 billion difference is unreconciled',
  'NGF Public Finance Database landing page showed unrelated injected third-party links',
  'The 2025 federal budget implementation period was extended to 31 December 2026',
]) assert.ok(prompt.toLowerCase().includes(required.toLowerCase()), 'missing evidence rule: ' + required);

assert.doesNotMatch(prompt, /57\.9% reporting rate/);
assert.doesNotMatch(prompt, /9\.3%\s*\(₦3\.34 trillion\)/);
assert.match(MODE_HINTS.civic, /45–90 words/);
assert.match(MODE_HINTS.civic, /no more than 120/);
assert.doesNotMatch(MODE_HINTS.civic, /four required CIVIC BRIEF headings/);

if (!header.includes('src="/iseyc-seal.svg"') || !header.includes('alt="ISEYC official seal"')) {
  throw new Error('Header must use the official ISEYC seal unchanged.');
}

for (const label of [
  'What is published so far?',
  'National health evidence',
  'State budget execution',
  'Education spending',
  'All-state fiscal disclosure',
  'Who is responsible?',
]) assert.ok(workspace.includes(label), 'missing concise starter: ' + label);

assert.match(workspace, /Ask about a published record or public evidence/);
assert.match(workspace, /Evidence brief/);
assert.doesNotMatch(workspace, /9\.3% of the 2026 state health budget/);
console.log('Civic Brain concise evidence experience contracts passed.');
