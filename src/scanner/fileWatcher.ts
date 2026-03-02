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
    const refreshAllViews = () => {
      this.diagnostics.refreshAll();
      this.treeProvider.refresh();
    };

    this.watcher.onDidChange(uri => {
      this.scanner.refreshFile(uri.fsPath);
      refreshAllViews();
    });
    this.watcher.onDidCreate(uri => {
      this.scanner.refreshFile(uri.fsPath);
      refreshAllViews();
    });
    this.watcher.onDidDelete(uri => {
      this.scanner.removeFile(uri.fsPath);
      refreshAllViews();
    });
  }

  dispose(): void {
    this.watcher.dispose();
  }
}
