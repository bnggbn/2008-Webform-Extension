import * as vscode from 'vscode';
import { DEFAULT_INCLUDE_GLOBS, toGlobPattern } from '../utils/globUtils';

export type RuleLevel = 'error' | 'warning' | 'information' | 'hint' | 'off';
export type CompatibilityProfile = 'vs2005' | 'vs2008' | 'vs2010' | 'vs2012' | 'vs2013' | 'vs2015' | 'custom';

export type WebFormsSettings = {
  enableCodeLens: boolean;
  enableDiagnostics: boolean;
  debug: {
    embeddedLanguageLogs: boolean;
  };
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
    embeddedJavaScriptParseError: RuleLevel;
    embeddedCssParseError: RuleLevel;
    unclosedAspServerTag: RuleLevel;
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
    debug: {
      embeddedLanguageLogs: config.get<boolean>('debug.embeddedLanguageLogs', false),
    },
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
      embeddedJavaScriptParseError: config.get<RuleLevel>('rules.embeddedJavaScriptParseError', 'warning'),
      embeddedCssParseError: config.get<RuleLevel>('rules.embeddedCssParseError', 'warning'),
      unclosedAspServerTag: config.get<RuleLevel>('rules.unclosedAspServerTag', 'warning'),
    },
  };
}

export function isEmbeddedDebugLogsEnabled(): boolean {
  return vscode.workspace
    .getConfiguration('webformsHelper')
    .get<boolean>('debug.embeddedLanguageLogs', false);
}
