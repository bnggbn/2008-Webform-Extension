import { EmbeddedProjectionRegion, projectAspxEmbeddedRegions } from '../../../projection/aspxEmbeddedProjection';
import { ProjectedJavaScriptSymbol } from './aspxJavaScriptSymbols';

export function getJavaScriptTagBodyRegions(documentText: string): EmbeddedProjectionRegion[] {
  return projectAspxEmbeddedRegions(documentText)
    .filter(region => region.language === 'javascript' && region.source === 'tag-body');
}

export function flattenSymbols(symbols: ProjectedJavaScriptSymbol[]): ProjectedJavaScriptSymbol[] {
  const flattened: ProjectedJavaScriptSymbol[] = [];
  for (const symbol of symbols) {
    flattened.push(symbol);
    flattened.push(...flattenSymbols(symbol.children));
  }
  return flattened;
}

export function readIdentifierAtOffset(text: string, offset: number): string | undefined {
  if (offset < 0 || offset >= text.length) {
    return undefined;
  }

  let start = offset;
  let end = offset;

  if (!isIdentifierChar(text[offset])) {
    if (offset > 0 && isIdentifierChar(text[offset - 1])) {
      start = offset - 1;
      end = offset - 1;
    } else {
      return undefined;
    }
  }

  while (start > 0 && isIdentifierChar(text[start - 1])) {
    start--;
  }
  while (end < text.length && isIdentifierChar(text[end])) {
    end++;
  }

  return start === end ? undefined : text.slice(start, end);
}

export function isIdentifierChar(value: string | undefined): boolean {
  return !!value && /[A-Za-z0-9_$]/.test(value);
}
