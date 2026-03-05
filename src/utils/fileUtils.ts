import * as fs from 'fs';
import * as vscode from 'vscode';

export function tryReadFile(path: string): string | undefined {
  const openDocument = vscode.workspace.textDocuments.find(document =>
    document.uri.scheme === 'file' && document.fileName.toLowerCase() === path.toLowerCase()
  );
  if (openDocument) {
    return openDocument.getText();
  }

  try {
    return fs.readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}
