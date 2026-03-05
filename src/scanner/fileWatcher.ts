import * as vscode from 'vscode';
import { DiagnosticEngine } from '../diagnostics/diagnosticEngine';
import { RelatedFilesTreeProvider } from '../navigation/relatedFilesTree';
import { isMarkupFile, isRelevantCodeFile } from '../utils/pathUtils';
import { WorkspaceScanner } from './workspaceScanner';

export class FileWatcher implements vscode.Disposable {
  private readonly watcher: vscode.FileSystemWatcher;
  private readonly changeDocumentSubscription: vscode.Disposable;
  private readonly openDocumentSubscription: vscode.Disposable;

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

    this.openDocumentSubscription = vscode.workspace.onDidOpenTextDocument(document => {
      if (!shouldRefreshInEditor(document.fileName)) {
        return;
      }

      this.diagnostics.refreshFile(document.fileName);
    });

    this.changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(event => {
      if (!shouldRefreshInEditor(event.document.fileName)) {
        return;
      }

      this.diagnostics.refreshFile(event.document.fileName);
    });

    // VS Code can restore editors before this watcher is wired.
    // Refresh already-open relevant files once so diagnostics are in sync.
    for (const document of vscode.workspace.textDocuments) {
      if (shouldRefreshInEditor(document.fileName)) {
        this.diagnostics.refreshFile(document.fileName);
      }
    }
  }

  dispose(): void {
    this.changeDocumentSubscription.dispose();
    this.openDocumentSubscription.dispose();
    this.watcher.dispose();
  }
}

function shouldRefreshInEditor(filePath: string): boolean {
  return isRelevantCodeFile(filePath) || isMarkupFile(filePath);
}
