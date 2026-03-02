import * as vscode from 'vscode';
import { RuleLevel } from './settings';

export function toSeverity(level: RuleLevel): vscode.DiagnosticSeverity {
  switch (level) {
    case 'error': return vscode.DiagnosticSeverity.Error;
    case 'warning': return vscode.DiagnosticSeverity.Warning;
    case 'hint': return vscode.DiagnosticSeverity.Hint;
    case 'information':
    case 'off':
    default:
      return vscode.DiagnosticSeverity.Information;
  }
}
