import * as vscode from 'vscode';

export {
  CompatibilityFeature,
  getCompatibilityProfile,
  getEffectiveLanguageVersion,
  isFeatureSupported,
} from './compatibilityCore';

export function positionAt(text: string, offset: number): vscode.Position {
  let line = 0;
  let character = 0;

  for (let i = 0; i < offset; i++) {
    if (text[i] === '\n') {
      line++;
      character = 0;
      continue;
    }

    if (text[i] !== '\r') {
      character++;
    }
  }

  return new vscode.Position(line, character);
}
