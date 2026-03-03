import * as vscode from 'vscode';
import { WebFormsSettings } from '../../../config/settings';
import { toSeverity } from '../../../config/ruleConfig';
import { DiagnosticKind } from '../../../models/diagnosticKinds';
import { findNameofExpressions } from '../compatibilitySyntaxFinders';
import { CompatibilityFeature, isFeatureSupported, positionAt } from '../compatibilityRuleUtils';
import { CompatibilityDiagnostic, CompatibilityRule, CompatibilityRuleContext } from './rule';

export class NameofCompatibilityRule implements CompatibilityRule {
  readonly id = 'unsupportedNameofExpression';
  readonly category = 'compatibility' as const;

  constructor(private readonly settings: WebFormsSettings) {}

  evaluate(context: CompatibilityRuleContext): CompatibilityDiagnostic[] {
    if (this.settings.rules.unsupportedNameofExpression === 'off'
      || isFeatureSupported(context.settings, CompatibilityFeature.NameofExpression)) {
      return [];
    }

    return findNameofExpressions(context.text).map(offset => {
      const start = positionAt(context.text, offset);
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(start, new vscode.Position(start.line, start.character + 'nameof'.length)),
        '`nameof` is not supported by the configured legacy C# language version.',
        toSeverity(context.settings.rules.unsupportedNameofExpression)
      );
      diagnostic.source = 'webformsHelper';
      diagnostic.code = DiagnosticKind.UnsupportedNameofExpression;
      return { path: context.path, diagnostic };
    });
  }
}
