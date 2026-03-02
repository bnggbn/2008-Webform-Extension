import * as vscode from 'vscode';
import { WebFormsSettings } from '../../config/settings';
import { WebFormEntry } from '../../models/webFormEntry';

export type RuleCategory = 'webforms' | 'compatibility';

export type RuleContext = {
  entry: WebFormEntry;
  settings: WebFormsSettings;
};

export interface WebFormsRule {
  readonly id: string;
  readonly category: RuleCategory;
  evaluate(context: RuleContext): vscode.Diagnostic[];
}
