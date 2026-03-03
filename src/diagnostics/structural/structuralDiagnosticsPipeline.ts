import * as vscode from 'vscode';
import { WebFormsSettings } from '../../config/settings';
import { WorkspaceScanner } from '../../scanner/workspaceScanner';
import { createStructuralRules } from './createStructuralRules';
import { RuleDiagnostic, StructuralRule } from './rules/rule';

export class StructuralDiagnosticsPipeline {
  private readonly rules: StructuralRule[];

  constructor(
    private readonly settings: WebFormsSettings,
    private readonly scanner: WorkspaceScanner,
    private readonly collection: vscode.DiagnosticCollection
  ) {
    this.rules = createStructuralRules(settings);
  }

  // Structural diagnostics work on resolved WebForms entries produced by the scanner.
  refreshAll(): void {
    const diagnosticsByPath = new Map<string, vscode.Diagnostic[]>();

    for (const entry of this.scanner.getAllEntries()) {
      const diagnostics = this.evaluateEntry(entry);
      this.addDiagnostics(diagnosticsByPath, diagnostics);
    }

    this.publishDiagnostics(diagnosticsByPath);
  }

  // Incremental structural refresh follows relationship impact, then republishes
  // diagnostics for the surviving markup roots tied to the changed paths.
  refreshPaths(paths: string[]): void {
    const impactedPaths = new Set(paths);
    const markupPaths = new Set<string>();

    for (const path of impactedPaths) {
      this.collection.delete(vscode.Uri.file(path));
      const entry = this.scanner.getEntryForFile(path);
      if (entry) {
        markupPaths.add(entry.markupPath);
        impactedPaths.add(entry.markupPath);
        if (entry.codeBehindPath) {
          impactedPaths.add(entry.codeBehindPath);
        }
        if (entry.designerPath) {
          impactedPaths.add(entry.designerPath);
        }
      }
    }

    for (const path of impactedPaths) {
      this.collection.delete(vscode.Uri.file(path));
    }

    const diagnosticsByPath = new Map<string, vscode.Diagnostic[]>();
    for (const markupPath of markupPaths) {
      const entry = this.scanner.getEntryForFile(markupPath);
      if (!entry) {
        continue;
      }

      const diagnostics = this.evaluateEntry(entry);
      this.addDiagnostics(diagnosticsByPath, diagnostics);
    }

    this.publishDiagnostics(diagnosticsByPath);
  }

  private evaluateEntry(entry: Parameters<StructuralRule['evaluate']>[0]['entry']): RuleDiagnostic[] {
    return this.rules.flatMap(rule => rule.evaluate({
      entry,
      settings: this.settings,
    }));
  }

  private publishDiagnostics(diagnosticsByPath: Map<string, vscode.Diagnostic[]>): void {
    for (const [path, diagnostics] of diagnosticsByPath) {
      this.collection.set(vscode.Uri.file(path), diagnostics);
    }
  }

  private addDiagnostics(
    diagnosticsByPath: Map<string, vscode.Diagnostic[]>,
    items: RuleDiagnostic[]
  ): void {
    for (const item of items) {
      const existing = diagnosticsByPath.get(item.path) ?? [];
      existing.push(item.diagnostic);
      diagnosticsByPath.set(item.path, existing);
    }
  }
}
