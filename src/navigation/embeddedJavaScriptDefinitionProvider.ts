import * as vscode from 'vscode';
import { isEmbeddedDebugLogsEnabled } from '../config/settings';
import { logOutput } from '../logging/outputChannel';
import { findProjectedJavaScriptDefinition } from '../projection/aspxJavaScriptDefinitions';
import { positionAt } from '../utils/textUtils';

export class EmbeddedJavaScriptDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
    const text = document.getText();
    const definition = findProjectedJavaScriptDefinition(text, document.offsetAt(position));
    if (!definition) {
      if (isEmbeddedDebugLogsEnabled()) {
        logOutput(`Embedded JS Definition: no match for "${document.fileName}" at ${position.line + 1}:${position.character + 1}.`);
      }
      return undefined;
    }

    logOutput(
      `Embedded JS Definition: "${definition.name}" in "${document.fileName}" from ${position.line + 1}:${position.character + 1}.`
    );

    const start = positionAt(text, definition.targetStart);
    const end = positionAt(text, definition.targetEnd);
    return new vscode.Location(
      document.uri,
      new vscode.Range(start.line, start.character, end.line, end.character)
    );
  }
}
