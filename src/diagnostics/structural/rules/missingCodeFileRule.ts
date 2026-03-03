import * as fs from 'fs';
import * as vscode from 'vscode';
import { WebFormsSettings } from '../../../config/settings';
import { toSeverity } from '../../../config/ruleConfig';
import { RuleContext, RuleDiagnostic, StructuralRule } from './rule';

export class MissingCodeFileRule implements StructuralRule {
  readonly id = 'missingCodeFile';
  readonly category = 'webforms' as const;

  constructor(private readonly settings: WebFormsSettings) {}

  evaluate(context: RuleContext): RuleDiagnostic[] {
    const { entry } = context;
    if (!entry.codeFile || !entry.codeBehindPath || fs.existsSync(entry.codeBehindPath)) {
      return [];
    }

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      `Code-behind file not found: ${entry.codeFile}`,
      toSeverity(this.settings.rules.missingCodeFile)
    );
    diagnostic.source = 'webformsHelper';
    return [{ path: entry.markupPath, diagnostic }];
  }
}
