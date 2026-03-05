import * as vscode from 'vscode';
import { toSeverity } from '../../config/ruleConfig';
import { isEmbeddedDebugLogsEnabled, RuleLevel, WebFormsSettings } from '../../config/settings';
import { logOutput } from '../../logging/outputChannel';
import { DiagnosticKind } from '../../models/diagnosticKinds';
import { WebFormEntry } from '../../models/webFormEntry';
import { EmbeddedLanguage } from '../../parser/embedded/types';
import { projectAspxEmbeddedRegions } from '../../projection/aspxEmbeddedProjection';
import { WorkspaceScanner } from '../../scanner/workspaceScanner';
import { tryReadFile } from '../../utils/fileUtils';
import { isMarkupFile } from '../../utils/pathUtils';
import { positionAt } from '../../utils/textUtils';
import { buildEmbeddedRegionDebugLines, buildEmbeddedRegionLineSummary } from './embeddedDebugLog';

export type ProjectedDiagnostic = {
  start: number;
  length: number;
  message: string;
};

export abstract class EmbeddedLanguageDiagnosticsPipelineBase {
  constructor(
    protected readonly settings: WebFormsSettings,
    protected readonly scanner: WorkspaceScanner,
    protected readonly collection: vscode.DiagnosticCollection
  ) {}

  protected abstract get language(): EmbeddedLanguage;
  protected abstract get diagnosticKind(): DiagnosticKind;
  protected abstract get logPrefix(): string;
  protected abstract get ruleSettingValue(): RuleLevel;
  protected abstract collectDiagnostics(text: string): ProjectedDiagnostic[];

  refreshAll(): void {
    for (const entry of this.scanner.getAllEntries()) {
      this.refreshMarkup(entry);
    }
  }

  refreshPaths(paths: string[]): void {
    const markupPaths = new Set<string>();
    for (const path of paths) {
      this.collection.delete(vscode.Uri.file(path));
      const entry = this.scanner.getEntryForFile(path);
      if (entry?.markupPath) {
        markupPaths.add(entry.markupPath);
      } else if (isMarkupFile(path)) {
        markupPaths.add(path);
      }
    }

    for (const markupPath of markupPaths) {
      const entry = this.scanner.getEntryForFile(markupPath);
      if (entry) {
        this.refreshMarkup(entry);
      } else {
        this.refreshMarkupPath(markupPath);
      }
    }
  }

  deleteFile(filePath: string): void {
    this.collection.delete(vscode.Uri.file(filePath));
  }

  private refreshMarkup(entry: WebFormEntry): void {
    this.refreshMarkupPath(entry.markupPath);
  }

  private refreshMarkupPath(markupPath: string): void {
    if (
      !this.settings.enableDiagnostics
      || this.ruleSettingValue === 'off'
      || !isMarkupFile(markupPath)
    ) {
      this.collection.delete(vscode.Uri.file(markupPath));
      return;
    }

    const text = tryReadFile(markupPath);
    if (text === undefined) {
      this.collection.delete(vscode.Uri.file(markupPath));
      logOutput(`${this.logPrefix}: unable to read markup "${markupPath}".`);
      return;
    }

    const projectedRegions = projectAspxEmbeddedRegions(text)
      .filter(region => region.language === this.language && region.hasServerTags);

    const diagnostics = this.collectDiagnostics(text).map(item => {
      const start = positionAt(text, item.start);
      const end = positionAt(text, item.start + item.length);
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(
          new vscode.Position(start.line, start.character),
          new vscode.Position(end.line, end.character)
        ),
        item.message,
        toSeverity(this.ruleSettingValue)
      );
      diagnostic.source = 'webformsHelper';
      diagnostic.code = this.diagnosticKind;
      return diagnostic;
    });

    logOutput(
      `${this.logPrefix}: "${markupPath}" regions=${projectedRegions.length} diagnostics=${diagnostics.length} lines=${buildEmbeddedRegionLineSummary(text, projectedRegions)}.`
    );
    if (isEmbeddedDebugLogsEnabled()) {
      for (const line of buildEmbeddedRegionDebugLines(text, this.logPrefix, projectedRegions)) {
        logOutput(line);
      }
    }

    if (diagnostics.length === 0) {
      this.collection.delete(vscode.Uri.file(markupPath));
      return;
    }

    this.collection.set(vscode.Uri.file(markupPath), diagnostics);
  }
}
