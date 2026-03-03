import * as fs from 'fs';
import * as vscode from 'vscode';
import { WebFormsSettings } from '../../config/settings';
import { WorkspaceScanner } from '../../scanner/workspaceScanner';
import { isRelevantCodeFile } from '../../utils/pathUtils';
import { createCompatibilityRules } from './createCompatibilityRules';
import { CompatibilityRule } from './rules/rule';

export class CompatibilityDiagnosticsPipeline {
  private readonly rules: CompatibilityRule[];

  constructor(
    private readonly settings: WebFormsSettings,
    private readonly scanner: WorkspaceScanner,
    private readonly collection: vscode.DiagnosticCollection
  ) {
    this.rules = createCompatibilityRules(settings);
  }

  // Compatibility diagnostics are file-local, so a full refresh walks known C# files.
  refreshAll(): void {
    for (const path of this.scanner.getAllCodeFilePaths()) {
      this.refreshFile(path);
    }
  }

  // Compatibility diagnostics operate on text snapshots and do not depend on the
  // WebForms relationship graph beyond code-file discovery.
  refreshFile(filePath: string): void {
    if (!isRelevantCodeFile(filePath)) {
      return;
    }

    const uri = vscode.Uri.file(filePath);
    const text = this.tryReadFile(filePath);
    if (text === undefined) {
      this.collection.delete(uri);
      return;
    }

    const diagnostics = this.evaluateFile(filePath, text);

    if (diagnostics.length === 0) {
      this.collection.delete(uri);
      return;
    }

    this.collection.set(uri, diagnostics);
  }

  deleteFile(filePath: string): void {
    if (!isRelevantCodeFile(filePath)) {
      return;
    }

    this.collection.delete(vscode.Uri.file(filePath));
  }

  private evaluateFile(filePath: string, text: string): vscode.Diagnostic[] {
    return this.rules
      .flatMap(rule => rule.evaluate({
        path: filePath,
        text,
        settings: this.settings,
      }))
      .map(item => item.diagnostic);
  }

  private tryReadFile(path: string): string | undefined {
    try {
      return fs.readFileSync(path, 'utf8');
    } catch {
      return undefined;
    }
  }
}
