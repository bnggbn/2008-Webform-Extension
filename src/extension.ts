import * as vscode from 'vscode';
import { loadSettings } from './config/settings';
import { DiagnosticEngine } from './diagnostics/diagnosticEngine';
import { logOutput } from './logging/outputChannel';
import { EmbeddedJavaScriptDefinitionProvider } from './navigation/embeddedJavaScriptDefinitionProvider';
import { EmbeddedJavaScriptDocumentSymbolProvider } from './navigation/embeddedJavaScriptDocumentSymbolProvider';
import { EmbeddedJavaScriptHoverProvider } from './navigation/embeddedJavaScriptHoverProvider';
import { EmbeddedJavaScriptReferenceProvider } from './navigation/embeddedJavaScriptReferenceProvider';
import { registerCommands } from './navigation/commands';
import { WebFormsCodeLensProvider } from './navigation/codeLensProvider';
import { RelatedFilesTreeProvider } from './navigation/relatedFilesTree';
import { FileWatcher } from './scanner/fileWatcher';
import { WorkspaceScanner } from './scanner/workspaceScanner';

export function activate(context: vscode.ExtensionContext): void {
  logOutput('Activating extension.');
  const settings = loadSettings();
  const scanner = new WorkspaceScanner(settings);
  const treeProvider = new RelatedFilesTreeProvider(scanner);
  const diagnostics = new DiagnosticEngine(settings, scanner);
  const watcher = new FileWatcher(scanner, diagnostics, treeProvider);

  registerCommands(context, scanner, treeProvider);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      [
        { language: 'webforms-aspx', scheme: 'file' },
        { pattern: '**/*.{aspx,ascx,master,ashx,asmx}' },
        { pattern: '**/*.cs' },
      ],
      new WebFormsCodeLensProvider(scanner)
    )
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('webformsHelper.relatedFiles', treeProvider)
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      [
        { pattern: '**/*.{aspx,ascx,master,ashx,asmx}' },
      ],
      new EmbeddedJavaScriptDocumentSymbolProvider()
    )
  );

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      [
        { pattern: '**/*.{aspx,ascx,master,ashx,asmx}' },
      ],
      new EmbeddedJavaScriptDefinitionProvider()
    )
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      [
        { pattern: '**/*.{aspx,ascx,master,ashx,asmx}' },
      ],
      new EmbeddedJavaScriptHoverProvider()
    )
  );

  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      [
        { pattern: '**/*.{aspx,ascx,master,ashx,asmx}' },
      ],
      new EmbeddedJavaScriptReferenceProvider()
    )
  );

  context.subscriptions.push(watcher);
  context.subscriptions.push(diagnostics);

  void scanner.refresh().then(() => {
    logOutput('Initial workspace scan completed. Running diagnostics refresh.');
    diagnostics.refreshAll();
  });
}

export function deactivate(): void {
  // no-op
}
