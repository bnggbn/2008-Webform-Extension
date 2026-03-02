import * as vscode from 'vscode';
import { DEFAULT_INCLUDE_GLOBS, toGlobPattern } from '../utils/globUtils';

export type RuleLevel = 'error' | 'warning' | 'information' | 'hint' | 'off';

export type WebFormsSettings = {
  enableCodeLens: boolean;
  enableDiagnostics: boolean;
  includeGlobs: string[];
  excludeGlobs: string[];
  includeGlobsPattern: string;
  excludeGlobsPattern: string;
  rules: {
    missingCodeFile: RuleLevel;
    missingDesigner: RuleLevel;
    missingInherits: RuleLevel;
    cs0103LikelyWebFormsFalsePositive: RuleLevel;
  };
  diagnostics: {
    maxControlGuidanceItems: number;
  };
};

export function loadSettings(): WebFormsSettings {
  const config = vscode.workspace.getConfiguration('webformsHelper');
  const excludeGlobs = config.get<string[]>('excludeGlobs', [
    '**/bin/**',
    '**/obj/**',
    '**/node_modules/**',
    '**/tools/_intellisense/**',
  ]);

  return {
    enableCodeLens: config.get<boolean>('enableCodeLens', true),
    enableDiagnostics: config.get<boolean>('enableDiagnostics', true),
    includeGlobs: config.get<string[]>('includeGlobs', DEFAULT_INCLUDE_GLOBS),
    excludeGlobs,
    includeGlobsPattern: toGlobPattern(config.get<string[]>('includeGlobs', DEFAULT_INCLUDE_GLOBS)),
    excludeGlobsPattern: `{${excludeGlobs.join(',')}}`,
    rules: {
      missingCodeFile: config.get<RuleLevel>('rules.missingCodeFile', 'warning'),
      missingDesigner: config.get<RuleLevel>('rules.missingDesigner', 'information'),
      missingInherits: config.get<RuleLevel>('rules.missingInherits', 'warning'),
      cs0103LikelyWebFormsFalsePositive: config.get<RuleLevel>('rules.cs0103LikelyWebFormsFalsePositive', 'information'),
    },
    diagnostics: {
      maxControlGuidanceItems: config.get<number>('diagnostics.maxControlGuidanceItems', 5),
    },
  };
}
