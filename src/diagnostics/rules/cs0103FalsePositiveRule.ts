import * as vscode from 'vscode';
import { WebFormsSettings } from '../../config/settings';
import { toSeverity } from '../../config/ruleConfig';
import { RuleContext, WebFormsRule } from './rule';

export class Cs0103FalsePositiveRule implements WebFormsRule {
  readonly id = 'cs0103LikelyWebFormsFalsePositive';
  readonly category = 'compatibility' as const;

  constructor(private readonly settings: WebFormsSettings) {}

  evaluate(context: RuleContext): vscode.Diagnostic[] {
    const { entry } = context;
    if (entry.serverControlIds.length === 0) {
      return [];
    }

    const missing = entry.serverControlIds.filter(id => !entry.designerFieldNames.includes(id));
    if (missing.length === 0) {
      return [];
    }

    const sample = missing.slice(0, context.settings.diagnostics.maxControlGuidanceItems);
    const suffix = missing.length > sample.length ? ` (+${missing.length - sample.length} more)` : '';

    return [this.createGuidance(
      `Possible WebForms CS0103 false positives or stale designer fields: ${sample.join(', ')}${suffix}`
    )];
  }

  createGuidance(message: string): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      message,
      toSeverity(this.settings.rules.cs0103LikelyWebFormsFalsePositive)
    );
    diagnostic.source = 'webformsHelper';
    return diagnostic;
  }
}
