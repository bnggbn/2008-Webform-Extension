import * as path from 'path';
import * as vscode from 'vscode';
import { WorkspaceScanner } from '../scanner/workspaceScanner';

export class RelatedFilesTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly emitter = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private readonly scanner: WorkspaceScanner) {}

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    const active = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (!active) return [];

    const entry = this.scanner.getEntryForFile(active);
    if (!entry) return [];

    return [entry.markupPath, entry.codeBehindPath, entry.designerPath]
      .filter((value): value is string => !!value)
      .map(filePath => {
        const item = new vscode.TreeItem(path.basename(filePath));
        item.description = filePath;
        item.command = {
          command: 'vscode.open',
          title: 'Open',
          arguments: [vscode.Uri.file(filePath)],
        };
        return item;
      });
  }
}
