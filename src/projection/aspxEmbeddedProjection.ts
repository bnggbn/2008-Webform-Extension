import { parseAspxEmbeddedRegions } from '../parser/embedded/embeddedRegionParser';
import { EmbeddedLanguage, EmbeddedRegion } from '../parser/embedded/types';

export type { EmbeddedLanguage } from '../parser/embedded/types';

export type EmbeddedProjectionRegion = EmbeddedRegion & {
  projectedText: string;
};

export function projectAspxEmbeddedRegions(documentText: string): EmbeddedProjectionRegion[] {
  return parseAspxEmbeddedRegions(documentText).map(region => ({
    ...region,
    projectedText: sanitizeServerTags(region.originalText, region.language),
  }));
}

export function toDocumentOffset(region: EmbeddedProjectionRegion, projectedOffset: number): number {
  return region.documentStart + projectedOffset;
}

function sanitizeServerTags(text: string, language: EmbeddedLanguage): string {
  let output = '';
  let cursor = 0;

  while (cursor < text.length) {
    const tagStart = text.indexOf('<%', cursor);
    if (tagStart < 0) {
      output += text.slice(cursor);
      break;
    }

    output += text.slice(cursor, tagStart);

    const tagEnd = text.indexOf('%>', tagStart + 2);
    if (tagEnd < 0) {
      output += text.slice(tagStart);
      break;
    }

    const tagText = text.slice(tagStart, tagEnd + 2);
    output += buildPaddedReplacement(tagText, getPlaceholderSeed(tagText, language));
    cursor = tagEnd + 2;
  }

  return output;
}

function getPlaceholderSeed(tagText: string, language: EmbeddedLanguage): string {
  const normalized = tagText.slice(2).trimStart();
  if (normalized.startsWith('--')) {
    return '';
  }

  if (/^[=:#$]/.test(normalized)) {
    return language === 'javascript' ? 'null' : 'inherit';
  }

  return '';
}

function buildPaddedReplacement(original: string, seed: string): string {
  const chars: string[] = Array.from(original, ch => (ch === '\r' || ch === '\n' ? ch : ' '));
  if (!seed) {
    return chars.join('');
  }

  let targetIndex = 0;
  for (const char of seed) {
    while (targetIndex < chars.length && (chars[targetIndex] === '\r' || chars[targetIndex] === '\n')) {
      targetIndex++;
    }
    if (targetIndex >= chars.length) {
      break;
    }
    chars[targetIndex] = char;
    targetIndex++;
  }

  return chars.join('');
}
