import * as vscode from 'vscode';
import {
  collectProjectedJavaScriptReferences,
} from '../services/embedded/javascript/aspxJavaScriptReferences';
import { collectExternalJavaScriptReferencesByName } from '../services/embedded/javascript/externalJavaScriptSearch';
import { collectReferencedExternalScriptPaths } from '../services/embedded/javascript/externalScriptResolver';
import { readIdentifierAtOffset } from '../services/embedded/javascript/aspxJavaScriptUtils';
import { tryReadFile } from '../utils/fileUtils';
import { positionAt } from '../utils/textUtils';

export class EmbeddedJavaScriptReferenceProvider implements vscode.ReferenceProvider {
  provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext
  ): vscode.ProviderResult<vscode.Location[]> {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const identifier = readIdentifierAtOffset(text, offset);
    if (!identifier) {
      return [];
    }

    const locations: vscode.Location[] = [];

    const pushProjectedReferences = (sourceText: string, uri: vscode.Uri): void => {
      const references = collectProjectedJavaScriptReferences(sourceText, offset);
      for (const reference of references) {
        if (!context.includeDeclaration && reference.isDeclaration) {
          continue;
        }
        const start = positionAt(sourceText, reference.start);
        const end = positionAt(sourceText, reference.end);
        locations.push(new vscode.Location(
          uri,
          new vscode.Range(start.line, start.character, end.line, end.character)
        ));
      }
    };

    pushProjectedReferences(text, document.uri);

    for (const scriptPath of collectReferencedExternalScriptPaths(text, document.fileName)) {
      const scriptText = tryReadFile(scriptPath);
      if (!scriptText) {
        continue;
      }

      for (const reference of collectExternalJavaScriptReferencesByName(scriptText, identifier)) {
        if (!context.includeDeclaration && reference.isDeclaration) {
          continue;
        }
        const start = positionAt(scriptText, reference.start);
        const end = positionAt(scriptText, reference.end);
        locations.push(new vscode.Location(
          vscode.Uri.file(scriptPath),
          new vscode.Range(start.line, start.character, end.line, end.character)
        ));
      }
    }

    return dedupeLocations(locations);
  }
}

function dedupeLocations(locations: vscode.Location[]): vscode.Location[] {
  const seen = new Set<string>();
  const output: vscode.Location[] = [];

  for (const location of locations) {
    const key = `${location.uri.fsPath}:${location.range.start.line}:${location.range.start.character}:${location.range.end.line}:${location.range.end.character}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(location);
  }

  return output;
}
