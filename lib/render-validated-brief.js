/**
 * User-facing markdown from server-validated brief only.
 * Prefer displayText; never model sources[].
 */

function preferDisplay(item, fallback) {
  if (item && typeof item === 'object') {
    if (typeof item.displayText === 'string' && item.displayText.trim()) return item.displayText.trim();
    if (typeof item.text === 'string') return item.text.trim();
  }
  if (typeof fallback === 'string') return fallback.trim();
  return '';
}

function line(label, text) {
  if (!text || !String(text).trim()) return '';
  return '**' + label + '**\n' + String(text).trim() + '\n';
}

function listBlock(title, items) {
  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) return '';
  const lines = ['**' + title + '**'];
  for (const item of arr) {
    const text = preferDisplay(item);
    if (!text) continue;
    const cls = item && item.classification ? item.classification : '';
    const tag =
      cls === 'RECOMMENDATION'
        ? ' _(recommendation)_'
        : cls === 'COMMUNITY_REPORT'
          ? ' _(published community report)_'
          : cls === 'UNKNOWN'
            ? ' _(unverified)_'
            : cls === 'HYPOTHESIS'
              ? ' _(hypothesis)_'
              : cls === 'ANALYSIS'
                ? ' _(analysis)_'
                : '';
    const review = item?.requiresHumanReview ? ' _(human review)_' : '';
    lines.push('- ' + text + tag + review);
  }
  return lines.length > 1 ? lines.join('\n') + '\n' : '';
}

export function renderValidatedBriefMarkdown(brief) {
  if (!brief || typeof brief !== 'object') {
    return [
      '**What the public record shows**',
      'No validated civic brief is available.',
      '',
      '**What it does not mean**',
      'This is not independent verification of government action.',
    ].join('\n');
  }

  const parts = [];
  parts.push('**Civic Brief (server-validated)**\n');

  const exec = preferDisplay(brief.executiveSummaryPolicy, brief.executiveSummary);
  const happening = preferDisplay(brief.whatIsHappeningPolicy, brief.whatIsHappening);
  const geo = preferDisplay(brief.geographicScopePolicy, brief.geographicScope);
  const limits = preferDisplay(brief.limitationsPolicy, brief.limitations);

  parts.push(line('Summary', exec));
  parts.push(line('What is happening', happening));
  parts.push(line('Geographic scope', geo));

  // Single findings path — prefer displayText
  parts.push(
    listBlock(
      'Findings',
      (brief.findings || []).map((f) => ({
        displayText: preferDisplay(f, f.text),
        classification: f.classification,
        requiresHumanReview: f.claimRelevance?.requiresHumanReview || f.requiresHumanReview,
      }))
    )
  );

  parts.push(listBlock('Community reports', brief.communityReports));
  parts.push(listBlock('Official evidence (documentary claims)', brief.officialEvidence));
  parts.push(listBlock('Possible explanations', brief.possibleExplanations));
  parts.push(listBlock('Institutional responsibilities (unverified patterns)', brief.institutionalResponsibilities));
  parts.push(listBlock('Public commitments (not proof of delivery)', brief.publicCommitments));
  parts.push(listBlock('Implementation / outcomes', brief.verifiedImplementation));
  parts.push(listBlock('Evidence gaps', brief.evidenceGaps));
  parts.push(listBlock('Recommendations', brief.recommendations));

  const sources = Array.isArray(brief.sources) ? brief.sources.filter((s) => s.serverOwned) : [];
  if (sources.length) {
    parts.push('**Sources (server registry only)**');
    for (const s of sources.slice(0, 12)) {
      parts.push(
        '- `' +
          s.id +
          '` — ' +
          (s.title || '').slice(0, 120) +
          (s.sourceUrl ? ' · ' + s.sourceUrl : '') +
          ' · ' +
          (s.sourceType || '')
      );
    }
    parts.push('');
  }

  parts.push(line('Limitations', limits));
  parts.push(
    '**Integrity note:** Generated from the server-validated brief only. Raw model JSON is not shown. Heuristic checks are not semantic proof or independent verification.'
  );

  if (Array.isArray(brief.unavailableEvidence) && brief.unavailableEvidence.length) {
    parts.push(
      '**Unavailable evidence channels:** ' +
        brief.unavailableEvidence.map((u) => u.channel + ' (' + u.reason + ')').join(', ')
    );
  }

  return parts.filter(Boolean).join('\n');
}
