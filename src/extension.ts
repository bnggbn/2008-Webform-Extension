import * as vscode from 'vscode';
import { loadSettings } from './config/settings';
import { DiagnosticEngine } from './diagnostics/diagnosticEngine';
import { registerCommands } from './navigation/commands';
import { WebFormsCodeLensProvider } from './navigation/codeLensProvider';
import { RelatedFilesTreeProvider } from './navigation/relatedFilesTree';
import { FileWatcher } from './scanner/fileWatcher';
import { WorkspaceScanner } from './scanner/workspaceScanner';

export function activate(context: vscode.ExtensionContext): void {
  const settings = loadSettings();
  const scanner = new WorkspaceScanner(settings);
  const treeProvider = new RelatedFilesTreeProvider(scanner);
  const diagnostics = new DiagnosticEngine(settings, scanner);
  const watcher = new FileWatcher(scanner, diagnostics, treeProvider);

  registerCommands(context, scanner, treeProvider);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { language: 'html', scheme: 'file' },
        { pattern: '**/*.{aspx,ascx,master,ashx,asmx}' },
        { pattern: '**/*.cs' },
      ],
      new WebFormsCodeLensProvider(scanner)
    )
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('webformsHelper.relatedFiles', treeProvider)
  );

  context.subscriptions.push(watcher);
  context.subscriptions.push(diagnostics);

  void scanner.refresh().then(() => diagnostics.refreshAll());
}

export function deactivate(): void {
  // no-op
}
