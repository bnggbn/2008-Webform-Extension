import { getAttributeLanguage, shouldProjectTag } from './embeddedLanguageResolver';
import { readAttributes, readOpenTag } from './htmlOpenTagParser';
import { EmbeddedRegion } from './types';

export function parseAspxEmbeddedRegions(documentText: string): EmbeddedRegion[] {
  const tagBodyRegions = [
    ...findTagBodyRegions(documentText, 'script'),
    ...findTagBodyRegions(documentText, 'style'),
  ];

  return [
    ...tagBodyRegions,
    ...findAttributeRegions(documentText, tagBodyRegions),
  ].sort((left, right) => left.documentStart - right.documentStart);
}

function findTagBodyRegions(documentText: string, tagName: 'script' | 'style'): EmbeddedRegion[] {
  const regions: EmbeddedRegion[] = [];
  const pattern = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}\\s*>`, 'gi');

  for (const match of documentText.matchAll(pattern)) {
    const rawTag = match[0];
    const fullMatchStart = match.index ?? 0;
    const openTagEnd = rawTag.indexOf('>') + 1;
    const closeTagStart = rawTag.toLowerCase().lastIndexOf(`</${tagName}`);

    if (openTagEnd <= 0 || closeTagStart < 0) {
      continue;
    }

    const openTag = rawTag.slice(0, openTagEnd);
    if (!shouldProjectTag(tagName, openTag)) {
      continue;
    }

    const originalText = rawTag.slice(openTagEnd, closeTagStart);
    const documentStart = fullMatchStart + openTagEnd;
    regions.push({
      language: tagName === 'script' ? 'javascript' : 'css',
      documentStart,
      documentEnd: documentStart + originalText.length,
      originalText,
      hasServerTags: /<%[\s\S]*?%>/.test(originalText),
      source: 'tag-body',
      containerTag: tagName,
    });
  }

  return regions;
}

function findAttributeRegions(documentText: string, excludedRegions: EmbeddedRegion[]): EmbeddedRegion[] {
  const regions: EmbeddedRegion[] = [];
  const excludedRanges = excludedRegions.map(region => ({
    start: region.documentStart,
    end: region.documentEnd,
  }));

  let cursor = 0;
  while (cursor < documentText.length) {
    const openTag = readOpenTag(documentText, cursor);
    if (!openTag) {
      cursor++;
      continue;
    }

    cursor = openTag.end;
    if (isInsideExcludedRange(openTag.start, excludedRanges) || openTag.raw.startsWith('</')) {
      continue;
    }

    for (const attribute of readAttributes(openTag.raw)) {
      const language = getAttributeLanguage(attribute.name.toLowerCase());
      if (!language || !/<%[\s\S]*?%>/.test(attribute.value)) {
        continue;
      }

      const documentStart = openTag.start + attribute.valueStart;
      regions.push({
        language,
        documentStart,
        documentEnd: documentStart + attribute.value.length,
        originalText: attribute.value,
        hasServerTags: true,
        source: 'attribute',
        containerTag: openTag.name,
        attributeName: attribute.name,
      });
    }
  }

  return regions;
}

function isInsideExcludedRange(offset: number, ranges: Array<{ start: number; end: number }>): boolean {
  return ranges.some(range => offset >= range.start && offset < range.end);
}
