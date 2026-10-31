/**
 * Render user-facing markdown ONLY from server-validated brief.
 * Never include raw model JSON or model sources[].
 */

function line(label, text) {
  if (!text || !String(text).trim()) return '';
  return '**' + label + '**\n' + String(text).trim() + '\n';
}

function listBlock(title, items, opts = {}) {
  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) return '';
  const lines = ['**' + title + '**'];
  for (const item of arr) {
    const text =
      typeof item === 'string'
        ? item
        : item.displayText || item.text || item.statement || item.summary || '';
    if (!text.trim()) continue;
    const cls = (item && item.classification) || opts.defaultClass || '';
    const tag = cls ? ' _[' + cls + ']_' : '';
    const review = item?.requiresHumanReview ? ' _(requires human review)_' : '';
    lines.push('- ' + text.trim() + tag + review);
  }
  return lines.length > 1 ? lines.join('\n') + '\n' : '';
}

/**
 * @param {object} brief - output of validateCivicBrief().brief
 */
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

  // Prefer policy displayText for high-risk string fields
  const exec =
    brief.executiveSummaryPolicy?.displayText ||
    brief.executiveSummaryPolicy?.text ||
    brief.executiveSummary;
  const happening =
    brief.whatIsHappeningPolicy?.displayText ||
    brief.whatIsHappeningPolicy?.text ||
    brief.whatIsHappening;

  parts.push(line('Summary', exec));
  parts.push(line('What is happening', happening));
  parts.push(line('Geographic scope', brief.geographicScope));

  parts.push(
    listBlock(
      'Findings',
      (brief.findings || []).map((f) => ({
        ...f,
        text:
          f.classification === 'UNKNOWN' || f.claimRelevance?.requiresHumanReview
            ? f.claimRelevance?.note
              ? '**Unverified:** ' + (f.text || '').slice(0, 200)
              : f.text
            : f.text,
        classification: f.classification,
        requiresHumanReview: f.claimRelevance?.requiresHumanReview,
      }))
    )
  );

  // For UNKNOWN findings, soften presentation
  // Rebuild findings with safer text
  const safeFindings = (brief.findings || []).map((f) => {
    if (f.classification === 'UNKNOWN' || f.classification === 'ANALYSIS') {
      return {
        text:
          (f.classification === 'UNKNOWN' ? '**Unverified / unknown:** ' : '**Analysis (not established fact):** ') +
          (f.text || ''),
        classification: f.classification,
        requiresHumanReview: true,
      };
    }
    if (f.classification === 'COMMUNITY_REPORT') {
      return {
        text: '**Community report (published record):** ' + (f.text || ''),
        classification: f.classification,
      };
    }
    if (f.classification === 'RECOMMENDATION') {
      return {
        text: '**Recommendation:** ' + (f.text || ''),
        classification: f.classification,
      };
    }
    return { text: f.text, classification: f.classification };
  });
  // Replace findings block more carefully
  parts.pop();
  parts.push(listBlock('Findings', safeFindings));

  parts.push(listBlock('Community reports', brief.communityReports, { defaultClass: 'COMMUNITY_REPORT' }));
  parts.push(listBlock('Official evidence (as stated)', brief.officialEvidence));
  parts.push(listBlock('Possible explanations', brief.possibleExplanations, { defaultClass: 'HYPOTHESIS' }));
  parts.push(listBlock('Institutional responsibilities (unverified patterns)', brief.institutionalResponsibilities));
  parts.push(listBlock('Public commitments (not proof of delivery)', brief.publicCommitments));
  parts.push(
    listBlock('Implementation / outcomes', brief.verifiedImplementation, { defaultClass: 'UNKNOWN' })
  );
  parts.push(listBlock('Evidence gaps', brief.evidenceGaps));
  parts.push(listBlock('Recommendations', brief.recommendations, { defaultClass: 'RECOMMENDATION' }));

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

  parts.push(line('Limitations', brief.limitations || brief.limitationsPolicy?.displayText));
  parts.push(
    '**Integrity note:** This text is generated from the server-validated brief. Raw model JSON is not shown. Heuristic checks are not semantic proof or independent verification.'
  );

  if (Array.isArray(brief.unavailableEvidence) && brief.unavailableEvidence.length) {
    parts.push(
      '**Unavailable evidence channels:** ' +
        brief.unavailableEvidence.map((u) => u.channel + ' (' + u.reason + ')').join(', ')
    );
  }

  return parts.filter(Boolean).join('\n');
}
