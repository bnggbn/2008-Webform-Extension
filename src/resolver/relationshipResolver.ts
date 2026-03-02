import * as fs from 'fs';
import * as path from 'path';
import { DirectiveInfo } from '../parser/directiveParser';
import { WebFormEntry } from '../models/webFormEntry';
import { detectWebFormKind, getMarkupCandidates } from './namingConventionResolver';

export function resolveWebFormEntry(filePath: string, directive?: DirectiveInfo): WebFormEntry | undefined {
  if (/\.(aspx|ascx|master|ashx|asmx)$/i.test(filePath)) {
    const codeBehindPath = directive?.codeFile
      ? path.resolve(path.dirname(filePath), directive.codeFile)
      : undefined;
    const designerPath = filePath.replace(/\.(aspx|ascx|master|ashx|asmx)$/i, '.designer.cs');

    return {
      kind: directive?.kind || detectWebFormKind(filePath),
      markupPath: filePath,
      codeBehindPath,
      designerPath,
      inherits: directive?.inherits,
      codeFile: directive?.codeFile,
      codeBehindDirective: directive?.codeBehindDirective,
      serverControlIds: directive?.serverControlIds || [],
      designerFieldNames: [],
    };
  }

  if (/\.cs$/i.test(filePath)) {
    const markupPath = getMarkupCandidates(filePath).find(candidate => fs.existsSync(candidate));
    if (!markupPath) {
      return undefined;
    }

    return {
      kind: detectWebFormKind(markupPath),
      markupPath,
      codeBehindPath: filePath.endsWith('.designer.cs') ? filePath.replace(/\.designer\.cs$/i, '.cs') : filePath,
      designerPath: markupPath.replace(/\.(aspx|ascx|master|ashx|asmx)$/i, '.designer.cs'),
      serverControlIds: [],
      designerFieldNames: [],
    };
  }

  return undefined;
}
