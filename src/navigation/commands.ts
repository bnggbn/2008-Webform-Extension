import * as vscode from 'vscode';
import { WorkspaceScanner } from '../scanner/workspaceScanner';
import { RelatedFilesTreeProvider } from './relatedFilesTree';

export function registerCommands(
  context: vscode.ExtensionContext,
  scanner: WorkspaceScanner,
  treeProvider: RelatedFilesTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('webformsHelper.goToCodeBehind', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      if (!filePath) return;
      const entry = scanner.getEntryForFile(filePath);
      await openFile(entry?.codeBehindPath, 'Code-behind file not found.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('webformsHelper.goToMarkup', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      if (!filePath) return;
      const entry = scanner.getEntryForFile(filePath);
      await openFile(entry?.markupPath, 'Markup file not found.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('webformsHelper.goToDesigner', async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      if (!filePath) return;
      const entry = scanner.getEntryForFile(filePath);
      await openFile(entry?.designerPath, 'Designer file not found.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('webformsHelper.refreshRelationships', async () => {
      await scanner.refresh();
      treeProvider.refresh();
    })
  );
}

async function openFile(targetPath: string | undefined, missingMessage: string): Promise<void> {
  if (!targetPath) {
    vscode.window.showWarningMessage(missingMessage);
    return;
  }

  try {
    const document = await vscode.workspace.openTextDocument(targetPath);
    await vscode.window.showTextDocument(document);
  } catch {
    vscode.window.showWarningMessage(missingMessage);
  }
}
