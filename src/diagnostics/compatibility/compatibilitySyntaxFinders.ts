import { scanCode } from './compatibilityCore';

export function findInterpolatedStrings(text: string): number[] {
  const matches: number[] = [];
  scanCode(text, index => {
    if (text[index] === '$' && (text[index + 1] === '"' || text[index + 1] === '@')) {
      matches.push(index);
    }
  });
  return matches;
}

export function findNameofExpressions(text: string): number[] {
  const matches: number[] = [];
  scanCode(text, index => {
    if (text.startsWith('nameof', index) && isBoundary(text[index - 1]) && isBoundary(text[index + 6])) {
      let cursor = index + 6;
      while (cursor < text.length && /\s/.test(text[cursor])) cursor++;
      if (text[cursor] === '(') matches.push(index);
    }
  });
  return matches;
}

export function findNullConditionalOperators(text: string): number[] {
  const matches: number[] = [];
  scanCode(text, index => {
    if (text[index] !== '?' || (text[index + 1] !== '.' && text[index + 1] !== '[')) return;
    const prev = text[index - 1];
    const next = text[index + 1];
    if (prev === '?' || prev === '<' || prev === '>' || next === '?') return;
    matches.push(index);
  });
  return matches;
}

function isBoundary(value: string | undefined): boolean {
  return !value || !/[A-Za-z0-9_]/.test(value);
}
