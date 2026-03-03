import * as vscode from 'vscode';
import { DEFAULT_INCLUDE_GLOBS, toGlobPattern } from '../utils/globUtils';

export type RuleLevel = 'error' | 'warning' | 'information' | 'hint' | 'off';
export type CompatibilityProfile = 'vs2005' | 'vs2008' | 'vs2010' | 'vs2012' | 'vs2013' | 'vs2015' | 'custom';

export type WebFormsSettings = {
  enableCodeLens: boolean;
  enableDiagnostics: boolean;
  includeGlobs: string[];
  excludeGlobs: string[];
  includeGlobsPattern: string;
  excludeGlobsPattern: string;
  compatibility: {
    profile: CompatibilityProfile;
    csharpLanguageVersion: string;
  };
  rules: {
    missingCodeFile: RuleLevel;
    missingDesigner: RuleLevel;
    missingInherits: RuleLevel;
    unsupportedStringInterpolation: RuleLevel;
    unsupportedNameofExpression: RuleLevel;
    unsupportedNullConditionalAccess: RuleLevel;
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
    compatibility: {
      profile: config.get<CompatibilityProfile>('compatibility.profile', 'vs2008'),
      csharpLanguageVersion: config.get<string>('compatibility.csharpLanguageVersion', ''),
    },
    rules: {
      missingCodeFile: config.get<RuleLevel>('rules.missingCodeFile', 'warning'),
      missingDesigner: config.get<RuleLevel>('rules.missingDesigner', 'information'),
      missingInherits: config.get<RuleLevel>('rules.missingInherits', 'warning'),
      unsupportedStringInterpolation: config.get<RuleLevel>('rules.unsupportedStringInterpolation', 'error'),
      unsupportedNameofExpression: config.get<RuleLevel>('rules.unsupportedNameofExpression', 'error'),
      unsupportedNullConditionalAccess: config.get<RuleLevel>('rules.unsupportedNullConditionalAccess', 'error'),
    },
  };
}
