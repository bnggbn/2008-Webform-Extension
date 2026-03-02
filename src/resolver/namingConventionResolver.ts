import * as path from 'path';
import { WebFormKind } from '../models/webFormEntry';

export function detectWebFormKind(filePath: string): WebFormKind {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ascx') return 'control';
  if (ext === '.master') return 'master';
  if (ext === '.ashx') return 'handler';
  if (ext === '.asmx') return 'service';
  return 'page';
}

export function getMarkupCandidates(codePath: string): string[] {
  const normalized = codePath.replace(/\.designer\.cs$/i, '.cs');
  return [
    normalized.replace(/\.aspx\.cs$/i, '.aspx'),
    normalized.replace(/\.ascx\.cs$/i, '.ascx'),
    normalized.replace(/\.master\.cs$/i, '.master'),
    normalized.replace(/\.ashx\.cs$/i, '.ashx'),
    normalized.replace(/\.asmx\.cs$/i, '.asmx'),
  ].filter(candidate => candidate !== normalized);
}
