import * as vscode from 'vscode';
import { WebFormsSettings } from '../../../config/settings';
import { toSeverity } from '../../../config/ruleConfig';
import { DiagnosticKind } from '../../../models/diagnosticKinds';
import { findNullConditionalOperators } from '../compatibilitySyntaxFinders';
import { CompatibilityFeature, isFeatureSupported, positionAt } from '../compatibilityRuleUtils';
import { CompatibilityDiagnostic, CompatibilityRule, CompatibilityRuleContext } from './rule';

export class NullConditionalCompatibilityRule implements CompatibilityRule {
  readonly id = 'unsupportedNullConditionalAccess';
  readonly category = 'compatibility' as const;

  constructor(private readonly settings: WebFormsSettings) {}

  evaluate(context: CompatibilityRuleContext): CompatibilityDiagnostic[] {
    if (this.settings.rules.unsupportedNullConditionalAccess === 'off'
      || isFeatureSupported(context.settings, CompatibilityFeature.NullConditionalAccess)) {
      return [];
    }

    return findNullConditionalOperators(context.text).map(offset => {
      const start = positionAt(context.text, offset);
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(start, new vscode.Position(start.line, start.character + 2)),
        'Null-conditional access is not supported by the configured legacy C# language version.',
        toSeverity(context.settings.rules.unsupportedNullConditionalAccess)
      );
      diagnostic.source = 'webformsHelper';
      diagnostic.code = DiagnosticKind.UnsupportedNullConditionalAccess;
      return { path: context.path, diagnostic };
    });
  }
}
