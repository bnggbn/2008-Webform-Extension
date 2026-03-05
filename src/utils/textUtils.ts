export function firstLine(text: string): string {
  return text.split(/\r?\n/, 1)[0] || '';
}

export function positionAt(text: string, offset: number): { line: number; character: number } {
  let line = 0;
  let character = 0;

  for (let i = 0; i < offset; i++) {
    if (text[i] === '\n') {
      line++;
      character = 0;
      continue;
    }

    if (text[i] !== '\r') {
      character++;
    }
  }

  return { line, character };
}
