export function firstLine(text: string): string {
  return text.split(/\r?\n/, 1)[0] || '';
}
