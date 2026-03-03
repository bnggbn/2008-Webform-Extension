import * as vscode from 'vscode';
import { WebFormsSettings } from '../../../config/settings';
import { toSeverity } from '../../../config/ruleConfig';
import { RuleContext, RuleDiagnostic, StructuralRule } from './rule';

export class MissingInheritsRule implements StructuralRule {
  readonly id = 'missingInherits';
  readonly category = 'webforms' as const;

  constructor(private readonly settings: WebFormsSettings) {}

  evaluate(context: RuleContext): RuleDiagnostic[] {
    const { entry } = context;
    if (entry.inherits) {
      return [];
    }

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'Inherits attribute is missing or could not be resolved.',
      toSeverity(this.settings.rules.missingInherits)
    );
    diagnostic.source = 'webformsHelper';
    return [{ path: entry.markupPath, diagnostic }];
  }
}
