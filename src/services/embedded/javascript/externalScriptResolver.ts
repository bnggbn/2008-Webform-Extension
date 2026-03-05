import * as path from 'path';
import * as vscode from 'vscode';

export function collectReferencedExternalScriptPaths(documentText: string, documentPath: string): string[] {
  const scriptPaths = new Set<string>();
  const scriptSrcPattern = /<script\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>/gi;
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  const owningFolder = workspaceFolders.find(folder => isPathUnder(documentPath, folder.uri.fsPath));

  for (const match of documentText.matchAll(scriptSrcPattern)) {
    const raw = (match[1] ?? match[2] ?? '').trim();
    if (!raw || /^(https?:)?\/\//i.test(raw) || raw.includes('<%')) {
      continue;
    }

    const clean = raw.split('#')[0].split('?')[0];
    if (!/\.js$/i.test(clean)) {
      continue;
    }

    const resolved = resolveScriptPath(clean, documentPath, owningFolder?.uri.fsPath);
    if (resolved) {
      scriptPaths.add(resolved);
    }
  }

  return Array.from(scriptPaths);
}

function resolveScriptPath(src: string, documentPath: string, workspaceRoot: string | undefined): string | undefined {
  if (src.startsWith('~/')) {
    return workspaceRoot ? path.resolve(workspaceRoot, src.slice(2)) : undefined;
  }

  if (src.startsWith('/')) {
    return workspaceRoot ? path.resolve(workspaceRoot, `.${src}`) : undefined;
  }

  return path.resolve(path.dirname(documentPath), src);
}

function isPathUnder(targetPath: string, basePath: string): boolean {
  const normalizedTarget = path.resolve(targetPath).toLowerCase();
  const normalizedBase = path.resolve(basePath).toLowerCase();
  return normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}${path.sep}`);
}
