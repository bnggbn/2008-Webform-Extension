import * as vscode from 'vscode';
import { toSeverity } from '../../config/ruleConfig';
import { isEmbeddedDebugLogsEnabled, RuleLevel } from '../../config/settings';
import { logOutput } from '../../logging/outputChannel';
import { DiagnosticKind } from '../../models/diagnosticKinds';
import { WebFormEntry } from '../../models/webFormEntry';
import { EmbeddedProjectionRegion } from '../../projection/aspxEmbeddedProjection';
import { WorkspaceScanner } from '../../scanner/workspaceScanner';
import { tryReadFile } from '../../utils/fileUtils';
import { isMarkupFile } from '../../utils/pathUtils';
import { positionAt } from '../../utils/textUtils';
import { buildEmbeddedRegionDebugLines, buildEmbeddedRegionLineSummary } from './embeddedDebugLog';

export type EmbeddedProjectedDiagnostic = {
  start: number;
  length: number;
  message: string;
};

type EmbeddedDiagnosticsRunnerOptions = {
  collection: vscode.DiagnosticCollection;
  scanner: WorkspaceScanner;
  logPrefix: string;
  diagnosticKind: DiagnosticKind;
  getRuleSettingValue: () => RuleLevel;
  isDiagnosticsEnabled: () => boolean;
  getProjectedRegions: (text: string) => EmbeddedProjectionRegion[];
  collectDiagnostics: (text: string) => EmbeddedProjectedDiagnostic[];
};

export class EmbeddedDiagnosticsRunner {
  constructor(private readonly options: EmbeddedDiagnosticsRunnerOptions) {}

  refreshAll(): void {
    for (const entry of this.options.scanner.getAllEntries()) {
      this.refreshMarkup(entry);
    }
  }

  refreshPaths(paths: string[]): void {
    const markupPaths = new Set<string>();
    for (const path of paths) {
      this.options.collection.delete(vscode.Uri.file(path));
      const entry = this.options.scanner.getEntryForFile(path);
      if (entry?.markupPath) {
        markupPaths.add(entry.markupPath);
      } else if (isMarkupFile(path)) {
        markupPaths.add(path);
      }
    }

    for (const markupPath of markupPaths) {
      const entry = this.options.scanner.getEntryForFile(markupPath);
      if (entry) {
        this.refreshMarkup(entry);
      } else {
        this.refreshMarkupPath(markupPath);
      }
    }
  }

  deleteFile(filePath: string): void {
    this.options.collection.delete(vscode.Uri.file(filePath));
  }

  private refreshMarkup(entry: WebFormEntry): void {
    this.refreshMarkupPath(entry.markupPath);
  }

  private refreshMarkupPath(markupPath: string): void {
    const ruleSettingValue = this.options.getRuleSettingValue();
    if (
      !this.options.isDiagnosticsEnabled()
      || ruleSettingValue === 'off'
      || !isMarkupFile(markupPath)
    ) {
      this.options.collection.delete(vscode.Uri.file(markupPath));
      return;
    }

    const text = tryReadFile(markupPath);
    if (text === undefined) {
      this.options.collection.delete(vscode.Uri.file(markupPath));
      logOutput(`${this.options.logPrefix}: unable to read markup "${markupPath}".`);
      return;
    }

    const projectedRegions = this.options.getProjectedRegions(text);
    const diagnostics = this.options.collectDiagnostics(text).map(item => {
      const start = positionAt(text, item.start);
      const end = positionAt(text, item.start + item.length);
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(
          new vscode.Position(start.line, start.character),
          new vscode.Position(end.line, end.character)
        ),
        item.message,
        toSeverity(ruleSettingValue)
      );
      diagnostic.source = 'webformsHelper';
      diagnostic.code = this.options.diagnosticKind;
      return diagnostic;
    });

    logOutput(
      `${this.options.logPrefix}: "${markupPath}" regions=${projectedRegions.length} diagnostics=${diagnostics.length} lines=${buildEmbeddedRegionLineSummary(text, projectedRegions)}.`
    );
    if (isEmbeddedDebugLogsEnabled()) {
      for (const line of buildEmbeddedRegionDebugLines(text, this.options.logPrefix, projectedRegions)) {
        logOutput(line);
      }
    }

    if (diagnostics.length === 0) {
      this.options.collection.delete(vscode.Uri.file(markupPath));
      return;
    }

    this.options.collection.set(vscode.Uri.file(markupPath), diagnostics);
  }
}
