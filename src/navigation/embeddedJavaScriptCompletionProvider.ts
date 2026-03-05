import * as vscode from 'vscode';
import { collectProjectedJavaScriptCompletions } from '../services/embedded/javascript/aspxJavaScriptCompletion';

export class EmbeddedJavaScriptCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const completions = collectProjectedJavaScriptCompletions(document.getText(), document.offsetAt(position));

    return completions.map(item => {
      const completion = new vscode.CompletionItem(
        item.name,
        item.kind === 'function' ? vscode.CompletionItemKind.Function : vscode.CompletionItemKind.Variable
      );
      completion.detail = item.kind === 'function'
        ? 'Embedded JavaScript function'
        : 'Embedded JavaScript variable';
      if (item.kind === 'function') {
        completion.insertText = `${item.name}()`;
      }
      return completion;
    });
  }
}
