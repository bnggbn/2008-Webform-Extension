import { EmbeddedProjectionRegion, projectAspxEmbeddedRegions, toDocumentOffset } from '../../../projection/aspxEmbeddedProjection';

export type ProjectedCssDiagnostic = {
  start: number;
  length: number;
  message: string;
  region: EmbeddedProjectionRegion;
};

export function collectProjectedCssDiagnostics(documentText: string): ProjectedCssDiagnostic[] {
  const regions = projectAspxEmbeddedRegions(documentText)
    .filter(region => region.language === 'css' && region.hasServerTags);

  return regions.flatMap(region => validateCssRegion(region));
}

function validateCssRegion(region: EmbeddedProjectionRegion): ProjectedCssDiagnostic[] {
  return region.source === 'attribute'
    ? validateDeclarationList(region, 0, region.projectedText.length, false)
    : validateStylesheet(region);
}

function validateStylesheet(region: EmbeddedProjectionRegion): ProjectedCssDiagnostic[] {
  const diagnostics: ProjectedCssDiagnostic[] = [];
  const text = region.projectedText;
  let cursor = 0;

  while (cursor < text.length) {
    cursor = skipTrivia(text, cursor);
    if (cursor >= text.length) {
      break;
    }

    const blockStart = findNextToken(text, cursor, ['{']);
    if (blockStart < 0) {
      break;
    }

    const blockEnd = findMatchingBrace(text, blockStart + 1);
    if (blockEnd < 0) {
      diagnostics.push(createDiagnostic(region, blockStart, 1, "'}' expected."));
      break;
    }

    diagnostics.push(...validateDeclarationList(region, blockStart + 1, blockEnd, true));
    cursor = blockEnd + 1;
  }

  return diagnostics;
}

function validateDeclarationList(
  region: EmbeddedProjectionRegion,
  start: number,
  end: number,
  insideRuleBlock: boolean
): ProjectedCssDiagnostic[] {
  const diagnostics: ProjectedCssDiagnostic[] = [];
  const text = region.projectedText;
  if (isOpaqueServerExpression(text.slice(start, end))) {
    return diagnostics;
  }
  let cursor = start;

  while (cursor < end) {
    cursor = skipTrivia(text, cursor, end);
    if (cursor >= end) {
      break;
    }

    if (text[cursor] === ';') {
      cursor++;
      continue;
    }

    if (insideRuleBlock && text[cursor] === '}') {
      break;
    }

    const propertyStart = cursor;
    while (cursor < end && !isOneOf(text[cursor], [':', ';', '}'])) {
      cursor++;
    }

    if (cursor >= end) {
      diagnostics.push(createDiagnostic(region, propertyStart, 1, 'colon expected'));
      break;
    }

    if (text[cursor] !== ':') {
      diagnostics.push(createDiagnostic(region, cursor, 1, 'colon expected'));
      if (text[cursor] === ';' || text[cursor] === '}') {
        cursor++;
      }
      continue;
    }

    cursor++;
    cursor = skipTrivia(text, cursor, end);
    const valueStart = cursor;
    let hasValue = false;
    let quote: '"' | '\'' | undefined;
    let parenDepth = 0;

    while (cursor < end) {
      const ch = text[cursor];

      if (!quote && (ch === '"' || ch === '\'')) {
        quote = ch as '"' | '\'';
        hasValue = true;
        cursor++;
        continue;
      }

      if (quote) {
        hasValue = true;
        if (ch === quote) {
          quote = undefined;
        } else if (ch === '\\') {
          cursor += 2;
          continue;
        }
        cursor++;
        continue;
      }

      if (ch === '(') {
        parenDepth++;
        hasValue = true;
        cursor++;
        continue;
      }

      if (ch === ')') {
        if (parenDepth > 0) {
          parenDepth--;
        }
        hasValue = true;
        cursor++;
        continue;
      }

      if (parenDepth === 0 && (ch === ';' || ch === '}')) {
        break;
      }

      if (!/\s/.test(ch)) {
        hasValue = true;
      }
      cursor++;
    }

    if (!hasValue) {
      diagnostics.push(createDiagnostic(region, valueStart, 1, 'property value expected'));
    }

    if (cursor < end && text[cursor] === ';') {
      cursor++;
      continue;
    }

    if (insideRuleBlock) {
      if (cursor < end && text[cursor] === '}') {
        continue;
      }

      if (cursor >= end) {
        diagnostics.push(createDiagnostic(region, end - 1, 1, "'}' expected."));
        break;
      }
    }
  }

  return diagnostics;
}

function isOpaqueServerExpression(text: string): boolean {
  const trimmed = text.trim();
  return trimmed === '' || trimmed === 'inherit';
}

function createDiagnostic(
  region: EmbeddedProjectionRegion,
  projectedStart: number,
  length: number,
  message: string
): ProjectedCssDiagnostic {
  return {
    start: toDocumentOffset(region, projectedStart),
    length,
    message,
    region,
  };
}

function findNextToken(text: string, start: number, tokens: string[]): number {
  let index = start;
  while (index < text.length) {
    index = skipTrivia(text, index);
    if (index >= text.length) {
      return -1;
    }

    if (tokens.includes(text[index])) {
      return index;
    }

    index++;
  }

  return -1;
}

function findMatchingBrace(text: string, start: number): number {
  let depth = 1;
  let cursor = start;
  let quote: '"' | '\'' | undefined;

  while (cursor < text.length) {
    const ch = text[cursor];
    if (!quote && (ch === '"' || ch === '\'')) {
      quote = ch as '"' | '\'';
      cursor++;
      continue;
    }
    if (quote) {
      if (ch === quote) {
        quote = undefined;
      } else if (ch === '\\') {
        cursor += 2;
        continue;
      }
      cursor++;
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return cursor;
      }
    }
    cursor++;
  }

  return -1;
}

function skipTrivia(text: string, start: number, end = text.length): number {
  let cursor = start;
  while (cursor < end) {
    if (/\s/.test(text[cursor])) {
      cursor++;
      continue;
    }

    if (text[cursor] === '/' && text[cursor + 1] === '*') {
      cursor += 2;
      while (cursor < end && !(text[cursor] === '*' && text[cursor + 1] === '/')) {
        cursor++;
      }
      cursor = Math.min(cursor + 2, end);
      continue;
    }

    break;
  }

  return cursor;
}

function isOneOf(value: string | undefined, targets: string[]): boolean {
  return !!value && targets.includes(value);
}
