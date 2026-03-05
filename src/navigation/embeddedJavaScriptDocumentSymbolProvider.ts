import * as vscode from 'vscode';
import { collectProjectedJavaScriptSymbols, ProjectedJavaScriptSymbol } from '../projection/aspxJavaScriptSymbols';
import { positionAt } from '../utils/textUtils';

export class EmbeddedJavaScriptDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const symbols = collectProjectedJavaScriptSymbols(document.getText());
    return symbols.map(symbol => toDocumentSymbol(document.getText(), symbol));
  }
}

function toDocumentSymbol(text: string, symbol: ProjectedJavaScriptSymbol): vscode.DocumentSymbol {
  const rangeStart = positionAt(text, symbol.start);
  const rangeEnd = positionAt(text, symbol.end);
  const selectionStart = positionAt(text, symbol.selectionStart);
  const selectionEnd = positionAt(text, symbol.selectionEnd);

  const documentSymbol = new vscode.DocumentSymbol(
    symbol.name,
    symbol.kind === 'function' ? 'embedded JavaScript function' : 'embedded JavaScript variable',
    symbol.kind === 'function' ? vscode.SymbolKind.Function : vscode.SymbolKind.Variable,
    new vscode.Range(rangeStart.line, rangeStart.character, rangeEnd.line, rangeEnd.character),
    new vscode.Range(selectionStart.line, selectionStart.character, selectionEnd.line, selectionEnd.character)
  );

  documentSymbol.children = symbol.children.map(child => toDocumentSymbol(text, child));
  return documentSymbol;
}
