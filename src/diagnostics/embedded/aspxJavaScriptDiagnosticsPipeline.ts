import * as vscode from 'vscode';
import { WebFormsSettings } from '../../config/settings';
import { DiagnosticKind } from '../../models/diagnosticKinds';
import { projectAspxEmbeddedRegions } from '../../projection/aspxEmbeddedProjection';
import { WorkspaceScanner } from '../../scanner/workspaceScanner';
import { collectProjectedJavaScriptDiagnostics } from '../../services/embedded/javascript/aspxJavaScriptValidation';
import { EmbeddedDiagnosticsRunner } from './embeddedDiagnosticsRunner';

export class AspxJavaScriptDiagnosticsPipeline {
  private readonly runner: EmbeddedDiagnosticsRunner;

  constructor(settings: WebFormsSettings, scanner: WorkspaceScanner, collection: vscode.DiagnosticCollection) {
    this.runner = new EmbeddedDiagnosticsRunner({
      collection,
      scanner,
      logPrefix: 'Embedded JS',
      diagnosticKind: DiagnosticKind.AspxEmbeddedJavaScriptParseError,
      getRuleSettingValue: () => settings.rules.embeddedJavaScriptParseError,
      isDiagnosticsEnabled: () => settings.enableDiagnostics,
      getProjectedRegions: text => projectAspxEmbeddedRegions(text)
        .filter(region => region.language === 'javascript' && region.hasServerTags),
      collectDiagnostics: text => collectProjectedJavaScriptDiagnostics(text),
    });
  }

  refreshAll(): void { this.runner.refreshAll(); }
  refreshPaths(paths: string[]): void { this.runner.refreshPaths(paths); }
  deleteFile(filePath: string): void { this.runner.deleteFile(filePath); }
}
