import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('WebForms Helper');
  }

  return channel;
}

export function logOutput(message: string): void {
  getOutputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
}
