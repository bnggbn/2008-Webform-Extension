import * as vscode from 'vscode';
import { DiagnosticEngine } from '../diagnostics/diagnosticEngine';
import { RelatedFilesTreeProvider } from '../navigation/relatedFilesTree';
import { WorkspaceScanner } from './workspaceScanner';

export class FileWatcher implements vscode.Disposable {
  private readonly watcher: vscode.FileSystemWatcher;

  constructor(
    private readonly scanner: WorkspaceScanner,
    private readonly diagnostics: DiagnosticEngine,
    private readonly treeProvider: RelatedFilesTreeProvider
  ) {
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*');

    this.watcher.onDidChange(uri => {
      this.scanner.refreshFile(uri.fsPath);
      this.diagnostics.refreshFile(uri.fsPath);
      this.treeProvider.refresh();
    });
    this.watcher.onDidCreate(uri => {
      this.scanner.refreshFile(uri.fsPath);
      this.diagnostics.refreshFile(uri.fsPath);
      this.treeProvider.refresh();
    });
    this.watcher.onDidDelete(uri => {
      const impactedPaths = this.scanner.getImpactedPaths(uri.fsPath);
      this.scanner.removeFile(uri.fsPath);
      this.diagnostics.removeFile(uri.fsPath, impactedPaths);
      this.treeProvider.refresh();
    });
  }

  dispose(): void {
    this.watcher.dispose();
  }
}
