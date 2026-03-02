import { WebFormKind } from '../models/webFormEntry';
import { detectWebFormKind } from '../resolver/namingConventionResolver';

export type DirectiveInfo = {
  kind: WebFormKind;
  inherits?: string;
  codeFile?: string;
  codeBehindDirective?: string;
  serverControlIds: string[];
};

export function parseDirectiveInfo(markup: string, filePath: string): DirectiveInfo {
  return {
    kind: detectWebFormKind(filePath),
    inherits: parseAttribute(markup, 'Inherits'),
    codeFile: parseAttribute(markup, 'CodeFile') || parseAttribute(markup, 'CodeBehind'),
    codeBehindDirective: parseAttribute(markup, 'CodeBehind'),
    serverControlIds: parseServerControlIds(markup),
  };
}

function parseAttribute(text: string, attributeName: string): string | undefined {
  const match = text.match(new RegExp(`${attributeName}\\s*=\\s*"([^"]+)"`, 'i'));
  return match?.[1];
}

function parseServerControlIds(markup: string): string[] {
  const matches = markup.matchAll(/\bID\s*=\s*"([^"]+)"[^>]*\brunat\s*=\s*"server"| \brunat\s*=\s*"server"[^>]*\bID\s*=\s*"([^"]+)"/gi);
  const ids = new Set<string>();

  for (const match of matches) {
    const value = match[1] || match[2];
    if (value) ids.add(value);
  }

  return Array.from(ids);
}
