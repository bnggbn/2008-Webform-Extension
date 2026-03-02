import * as vscode from 'vscode';
import { WorkspaceScanner } from '../scanner/workspaceScanner';

export class WebFormsCodeLensProvider implements vscode.CodeLensProvider {
  constructor(private readonly scanner: WorkspaceScanner) {}

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const entry = this.scanner.getEntryForFile(document.uri.fsPath);
    if (!entry) return [];

    const top = new vscode.Range(0, 0, 0, 0);
    const lenses: vscode.CodeLens[] = [];

    if (entry.codeBehindPath) {
      lenses.push(new vscode.CodeLens(top, {
        title: 'Open code-behind',
        command: 'webformsHelper.goToCodeBehind',
      }));
    }

    if (entry.markupPath && entry.markupPath !== document.uri.fsPath) {
      lenses.push(new vscode.CodeLens(top, {
        title: 'Open markup',
        command: 'webformsHelper.goToMarkup',
      }));
    }

    if (entry.designerPath) {
      lenses.push(new vscode.CodeLens(top, {
        title: 'Open designer',
        command: 'webformsHelper.goToDesigner',
      }));
    }

    return lenses;
  }
}
