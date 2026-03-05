import { RuleLevel, WebFormsSettings } from '../../config/settings';
import { DiagnosticKind } from '../../models/diagnosticKinds';
import { EmbeddedLanguage } from '../../parser/embedded/types';
import { collectProjectedJavaScriptDiagnostics } from '../../projection/aspxJavaScriptValidation';
import { WorkspaceScanner } from '../../scanner/workspaceScanner';
import * as vscode from 'vscode';
import { EmbeddedLanguageDiagnosticsPipelineBase, ProjectedDiagnostic } from './embeddedLanguageDiagnosticsPipelineBase';

export class AspxJavaScriptDiagnosticsPipeline extends EmbeddedLanguageDiagnosticsPipelineBase {
  constructor(settings: WebFormsSettings, scanner: WorkspaceScanner, collection: vscode.DiagnosticCollection) {
    super(settings, scanner, collection);
  }

  protected get language(): EmbeddedLanguage { return 'javascript'; }
  protected get diagnosticKind(): DiagnosticKind { return DiagnosticKind.AspxEmbeddedJavaScriptParseError; }
  protected get logPrefix(): string { return 'Embedded JS'; }
  protected get ruleSettingValue(): RuleLevel { return this.settings.rules.embeddedJavaScriptParseError; }

  protected collectDiagnostics(text: string): ProjectedDiagnostic[] {
    return collectProjectedJavaScriptDiagnostics(text);
  }
}
