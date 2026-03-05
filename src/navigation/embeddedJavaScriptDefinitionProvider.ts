import * as vscode from 'vscode';
import { isEmbeddedDebugLogsEnabled } from '../config/settings';
import { logOutput } from '../logging/outputChannel';
import { findExternalJavaScriptDefinitionByName } from '../services/embedded/javascript/externalJavaScriptSearch';
import { collectReferencedExternalScriptPaths } from '../services/embedded/javascript/externalScriptResolver';
import { findProjectedJavaScriptDefinition, findProjectedJavaScriptDefinitionByName } from '../services/embedded/javascript/aspxJavaScriptDefinitions';
import { readIdentifierAtOffset } from '../services/embedded/javascript/aspxJavaScriptUtils';
import { tryReadFile } from '../utils/fileUtils';
import { positionAt } from '../utils/textUtils';

export class EmbeddedJavaScriptDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const localDefinition = findProjectedJavaScriptDefinition(text, offset);
    if (localDefinition) {
      logOutput(
        `Embedded JS Definition: "${localDefinition.name}" in "${document.fileName}" from ${position.line + 1}:${position.character + 1}.`
      );

      const start = positionAt(text, localDefinition.targetStart);
      const end = positionAt(text, localDefinition.targetEnd);
      return new vscode.Location(
        document.uri,
        new vscode.Range(start.line, start.character, end.line, end.character)
      );
    }

    const identifier = readIdentifierAtOffset(text, offset);
    if (!identifier) {
      if (isEmbeddedDebugLogsEnabled()) {
        logOutput(`Embedded JS Definition: no match for "${document.fileName}" at ${position.line + 1}:${position.character + 1}.`);
      }
      return undefined;
    }

    // Keep projected markup lookup local-only, then resolve external script files referenced by src.
    const localByName = findProjectedJavaScriptDefinitionByName(text, identifier);
    if (localByName) {
      const start = positionAt(text, localByName.targetStart);
      const end = positionAt(text, localByName.targetEnd);
      return new vscode.Location(
        document.uri,
        new vscode.Range(start.line, start.character, end.line, end.character)
      );
    }

    const scriptPaths = collectReferencedExternalScriptPaths(text, document.fileName);
    // In browser globals, later script tags can overwrite earlier declarations.
    // Prefer the last referenced external script when duplicate names exist.
    for (let index = scriptPaths.length - 1; index >= 0; index--) {
      const scriptPath = scriptPaths[index];
      const scriptText = tryReadFile(scriptPath);
      if (!scriptText) {
        continue;
      }

      const definition = findExternalJavaScriptDefinitionByName(scriptText, identifier);
      if (!definition) {
        continue;
      }

      const start = positionAt(scriptText, definition.start);
      const end = positionAt(scriptText, definition.end);
      logOutput(`Embedded JS Definition: "${identifier}" resolved to external script "${scriptPath}".`);
      return new vscode.Location(
        vscode.Uri.file(scriptPath),
        new vscode.Range(start.line, start.character, end.line, end.character)
      );
    }

    if (isEmbeddedDebugLogsEnabled()) {
      logOutput(`Embedded JS Definition: no external-script match for "${identifier}" from "${document.fileName}".`);
    }
    return undefined;
  }
}
