import { RuleLevel, WebFormsSettings } from '../../config/settings';
import { DiagnosticKind } from '../../models/diagnosticKinds';
import { EmbeddedLanguage } from '../../parser/embedded/types';
import { collectProjectedCssDiagnostics } from '../../projection/aspxCssValidation';
import { WorkspaceScanner } from '../../scanner/workspaceScanner';
import * as vscode from 'vscode';
import { EmbeddedLanguageDiagnosticsPipelineBase, ProjectedDiagnostic } from './embeddedLanguageDiagnosticsPipelineBase';

export class AspxCssDiagnosticsPipeline extends EmbeddedLanguageDiagnosticsPipelineBase {
  constructor(settings: WebFormsSettings, scanner: WorkspaceScanner, collection: vscode.DiagnosticCollection) {
    super(settings, scanner, collection);
  }

  protected get language(): EmbeddedLanguage { return 'css'; }
  protected get diagnosticKind(): DiagnosticKind { return DiagnosticKind.AspxEmbeddedCssParseError; }
  protected get logPrefix(): string { return 'Embedded CSS'; }
  protected get ruleSettingValue(): RuleLevel { return this.settings.rules.embeddedCssParseError; }

  protected collectDiagnostics(text: string): ProjectedDiagnostic[] {
    return collectProjectedCssDiagnostics(text);
  }
}
