import * as vscode from 'vscode';
import { WebFormsSettings } from '../config/settings';
import { WorkspaceScanner } from '../scanner/workspaceScanner';
import { createDefaultRules } from './rules/createDefaultRules';
import { WebFormsRule } from './rules/rule';

export class DiagnosticEngine implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection('webformsHelper');
  private readonly rules: WebFormsRule[];

  constructor(
    private readonly settings: WebFormsSettings,
    private readonly scanner: WorkspaceScanner
  ) {
    this.rules = createDefaultRules(this.settings);
  }

  refreshAll(): void {
    this.collection.clear();

    for (const entry of this.scanner.getAllEntries()) {
      const diagnostics = this.rules.flatMap(rule => rule.evaluate({
        entry,
        settings: this.settings,
      }));
      if (diagnostics.length > 0) {
        this.collection.set(vscode.Uri.file(entry.markupPath), diagnostics);
      }
    }
  }

  dispose(): void {
    this.collection.dispose();
  }
}
