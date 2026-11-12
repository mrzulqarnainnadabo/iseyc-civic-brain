export const MAX_NARRATIVE_WORDS = 120;

/**
 * Keep default chat responses short without cutting through a sentence.
 * Structured Civic Brief mode is validated separately and is not passed here.
 */
export function compactNarrative(value, maxWords = MAX_NARRATIVE_WORDS) {
  const text = String(value || '').trim();
  const limit = Number.isInteger(maxWords) && maxWords > 0 ? maxWords : MAX_NARRATIVE_WORDS;
  const words = text.match(/\S+/g) || [];
  if (words.length <= limit) return text;

  const sentences = text.split(/(?<=[.!?])\\s+(?=[A-Z0-9#*•-])/);
  const kept = [];
  let count = 0;
  for (const sentence of sentences) {
    const sentenceWords = sentence.match(/\S+/g) || [];
    if (count + sentenceWords.length > limit) break;
    kept.push(sentence.trim());
    count += sentenceWords.length;
  }
  if (kept.length) return kept.join(' ').trim();

  return words.slice(0, limit).join(' ').replace(/[\s,;:—-]+$/, '') + '…';
}
