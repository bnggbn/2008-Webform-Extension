import * as vscode from 'vscode';
import { findProjectedJavaScriptHover } from '../services/embedded/javascript/aspxJavaScriptHover';
import { positionAt } from '../utils/textUtils';

export class EmbeddedJavaScriptHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    const text = document.getText();
    const hover = findProjectedJavaScriptHover(text, document.offsetAt(position));
    if (!hover) {
      return undefined;
    }

    const start = positionAt(text, hover.start);
    const end = positionAt(text, hover.end);
    const range = new vscode.Range(start.line, start.character, end.line, end.character);
    const contents = new vscode.MarkdownString(
      hover.kind === 'function'
        ? `$(symbol-function) Embedded JavaScript function \`${hover.name}()\``
        : `$(symbol-variable) Embedded JavaScript variable \`${hover.name}\``
    );
    contents.isTrusted = false;
    return new vscode.Hover(contents, range);
  }
}
