import * as vscode from 'vscode';
import { WebFormsSettings } from '../../../config/settings';
import { toSeverity } from '../../../config/ruleConfig';
import { DiagnosticKind } from '../../../models/diagnosticKinds';
import { findInterpolatedStrings } from '../compatibilitySyntaxFinders';
import { CompatibilityFeature, isFeatureSupported, positionAt } from '../compatibilityRuleUtils';
import { CompatibilityDiagnostic, CompatibilityRule, CompatibilityRuleContext } from './rule';

export class StringInterpolationCompatibilityRule implements CompatibilityRule {
  readonly id = 'unsupportedStringInterpolation';
  readonly category = 'compatibility' as const;

  constructor(private readonly settings: WebFormsSettings) {}

  evaluate(context: CompatibilityRuleContext): CompatibilityDiagnostic[] {
    if (this.settings.rules.unsupportedStringInterpolation === 'off'
      || isFeatureSupported(context.settings, CompatibilityFeature.StringInterpolation)) {
      return [];
    }

    return findInterpolatedStrings(context.text).map(offset => {
      const start = positionAt(context.text, offset);
      const end = new vscode.Position(start.line, start.character + 2);
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(start, end),
        'String interpolation is not supported by the configured legacy C# language version.',
        toSeverity(context.settings.rules.unsupportedStringInterpolation)
      );
      diagnostic.source = 'webformsHelper';
      diagnostic.code = DiagnosticKind.UnsupportedStringInterpolation;
      return { path: context.path, diagnostic };
    });
  }
}
