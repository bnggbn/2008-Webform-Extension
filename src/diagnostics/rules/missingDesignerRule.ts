import * as fs from 'fs';
import * as vscode from 'vscode';
import { WebFormsSettings } from '../../config/settings';
import { toSeverity } from '../../config/ruleConfig';
import { RuleContext, WebFormsRule } from './rule';

export class MissingDesignerRule implements WebFormsRule {
  readonly id = 'missingDesigner';
  readonly category = 'webforms' as const;

  constructor(private readonly settings: WebFormsSettings) {}

  evaluate(context: RuleContext): vscode.Diagnostic[] {
    const { entry } = context;
    if (!entry.designerPath || fs.existsSync(entry.designerPath)) {
      return [];
    }

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      'Designer file not found.',
      toSeverity(this.settings.rules.missingDesigner)
    );
    diagnostic.source = 'webformsHelper';
    return [diagnostic];
  }
}
