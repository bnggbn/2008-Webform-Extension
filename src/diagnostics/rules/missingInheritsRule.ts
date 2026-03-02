import * as vscode from 'vscode';
import { WebFormsSettings } from '../../config/settings';
import { toSeverity } from '../../config/ruleConfig';
import { RuleContext, WebFormsRule } from './rule';

export class MissingInheritsRule implements WebFormsRule {
  readonly id = 'missingInherits';
  readonly category = 'webforms' as const;

  constructor(private readonly settings: WebFormsSettings) {}

  evaluate(context: RuleContext): vscode.Diagnostic[] {
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
    return [diagnostic];
  }
}
