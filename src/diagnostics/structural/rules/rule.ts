import * as vscode from 'vscode';
import { WebFormsSettings } from '../../../config/settings';
import { WebFormEntry } from '../../../models/webFormEntry';

export type RuleContext = {
  entry: WebFormEntry;
  settings: WebFormsSettings;
};

export type RuleDiagnostic = {
  path: string;
  diagnostic: vscode.Diagnostic;
};

export interface StructuralRule {
  readonly id: string;
  readonly category: 'webforms';
  evaluate(context: RuleContext): RuleDiagnostic[];
}
