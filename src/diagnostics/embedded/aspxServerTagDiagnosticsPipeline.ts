import * as vscode from 'vscode';
import { WebFormsSettings } from '../../config/settings';
import { DiagnosticKind } from '../../models/diagnosticKinds';
import { projectAspxEmbeddedRegions } from '../../projection/aspxEmbeddedProjection';
import { collectProjectedAspxServerTagDiagnostics } from '../../projection/aspxServerTagValidation';
import { WorkspaceScanner } from '../../scanner/workspaceScanner';
import { EmbeddedDiagnosticsRunner } from './embeddedDiagnosticsRunner';

export class AspxServerTagDiagnosticsPipeline {
  private readonly runner: EmbeddedDiagnosticsRunner;

  constructor(settings: WebFormsSettings, scanner: WorkspaceScanner, collection: vscode.DiagnosticCollection) {
    this.runner = new EmbeddedDiagnosticsRunner({
      collection,
      scanner,
      logPrefix: 'Embedded ASP tag',
      diagnosticKind: DiagnosticKind.AspxUnclosedServerTag,
      getRuleSettingValue: () => settings.rules.unclosedAspServerTag,
      isDiagnosticsEnabled: () => settings.enableDiagnostics,
      getProjectedRegions: text => projectAspxEmbeddedRegions(text),
      collectDiagnostics: text => collectProjectedAspxServerTagDiagnostics(text),
    });
  }

  refreshAll(): void { this.runner.refreshAll(); }
  refreshPaths(paths: string[]): void { this.runner.refreshPaths(paths); }
  deleteFile(filePath: string): void { this.runner.deleteFile(filePath); }
}
