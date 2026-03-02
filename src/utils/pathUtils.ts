export function isMarkupFile(filePath: string): boolean {
  return /\.(aspx|ascx|master|ashx|asmx)$/i.test(filePath);
}

export function isRelevantCodeFile(filePath: string): boolean {
  return /\.cs$/i.test(filePath);
}
