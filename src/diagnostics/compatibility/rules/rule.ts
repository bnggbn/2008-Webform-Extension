import * as vscode from 'vscode';
import { WebFormsSettings } from '../../../config/settings';

export type CompatibilityRuleContext = {
  path: string;
  text: string;
  settings: WebFormsSettings;
};

export type CompatibilityDiagnostic = {
  path: string;
  diagnostic: vscode.Diagnostic;
};

export interface CompatibilityRule {
  readonly id: string;
  readonly category: 'compatibility';
  evaluate(context: CompatibilityRuleContext): CompatibilityDiagnostic[];
}
