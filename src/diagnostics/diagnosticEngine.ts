import * as vscode from 'vscode';
import { WebFormsSettings } from '../config/settings';
import { WorkspaceScanner } from '../scanner/workspaceScanner';
import { CompatibilityDiagnosticsPipeline } from './compatibility/compatibilityDiagnosticsPipeline';
import { AspxCssDiagnosticsPipeline } from './embedded/aspxCssDiagnosticsPipeline';
import { AspxJavaScriptDiagnosticsPipeline } from './embedded/aspxJavaScriptDiagnosticsPipeline';
import { AspxServerTagDiagnosticsPipeline } from './embedded/aspxServerTagDiagnosticsPipeline';
import { StructuralDiagnosticsPipeline } from './structural/structuralDiagnosticsPipeline';
import { isRelevantCodeFile } from '../utils/pathUtils';

export class DiagnosticEngine implements vscode.Disposable {
  private readonly webFormsCollection = vscode.languages.createDiagnosticCollection('webformsHelper-webforms');
  private readonly compatibilityCollection = vscode.languages.createDiagnosticCollection('webformsHelper-compatibility');
  private readonly embeddedJavaScriptCollection = vscode.languages.createDiagnosticCollection('webformsHelper-embedded-javascript');
  private readonly embeddedCssCollection = vscode.languages.createDiagnosticCollection('webformsHelper-embedded-css');
  private readonly embeddedAspServerTagCollection = vscode.languages.createDiagnosticCollection('webformsHelper-embedded-asp');
  private readonly structuralPipeline: StructuralDiagnosticsPipeline;
  private readonly compatibilityPipeline: CompatibilityDiagnosticsPipeline;
  private readonly embeddedJavaScriptPipeline: AspxJavaScriptDiagnosticsPipeline;
  private readonly embeddedCssPipeline: AspxCssDiagnosticsPipeline;
  private readonly embeddedAspServerTagPipeline: AspxServerTagDiagnosticsPipeline;

  constructor(
    private readonly settings: WebFormsSettings,
    private readonly scanner: WorkspaceScanner
  ) {
    this.structuralPipeline = new StructuralDiagnosticsPipeline(
      this.settings,
      this.scanner,
      this.webFormsCollection
    );
    this.compatibilityPipeline = new CompatibilityDiagnosticsPipeline(
      this.settings,
      this.scanner,
      this.compatibilityCollection
    );
    this.embeddedJavaScriptPipeline = new AspxJavaScriptDiagnosticsPipeline(
      this.settings,
      this.scanner,
      this.embeddedJavaScriptCollection
    );
    this.embeddedCssPipeline = new AspxCssDiagnosticsPipeline(
      this.settings,
      this.scanner,
      this.embeddedCssCollection
    );
    this.embeddedAspServerTagPipeline = new AspxServerTagDiagnosticsPipeline(
      this.settings,
      this.scanner,
      this.embeddedAspServerTagCollection
    );
  }

  dispose(): void {
    this.webFormsCollection.dispose();
    this.compatibilityCollection.dispose();
    this.embeddedJavaScriptCollection.dispose();
    this.embeddedCssCollection.dispose();
    this.embeddedAspServerTagCollection.dispose();
  }

  refreshAll(): void {
    this.runFullRefreshPipeline();
  }

  refreshFile(filePath: string): void {
    this.runIncrementalRefreshPipeline(filePath);
  }

  removeFile(filePath: string, stalePaths: string[]): void {
    this.runRemovePipeline(filePath, stalePaths);
  }

  // Full refresh is used at activation time or after an explicit rescan.
  // The scanner has already built the relationship graph before we enter here.
  private runFullRefreshPipeline(): void {
    this.clearAllCollections();
    if (!this.settings.enableDiagnostics) {
      return;
    }

    this.structuralPipeline.refreshAll();
    this.compatibilityPipeline.refreshAll();
    this.embeddedJavaScriptPipeline.refreshAll();
    this.embeddedCssPipeline.refreshAll();
    this.embeddedAspServerTagPipeline.refreshAll();
  }

  // Incremental refresh keeps the two pipelines independent:
  // structural diagnostics follow relationship impact, compatibility diagnostics
  // only re-evaluate the edited C# file.
  private runIncrementalRefreshPipeline(filePath: string): void {
    if (!this.settings.enableDiagnostics) {
      this.clearFile(filePath);
      return;
    }

    const impactedPaths = this.scanner.getImpactedPaths(filePath);
    this.structuralPipeline.refreshPaths(impactedPaths);
    this.compatibilityPipeline.refreshFile(filePath);
    this.embeddedJavaScriptPipeline.refreshPaths(impactedPaths);
    this.embeddedCssPipeline.refreshPaths(impactedPaths);
    this.embeddedAspServerTagPipeline.refreshPaths(impactedPaths);
  }

  // Remove handling clears stale diagnostics first, then rebuilds any surviving
  // relationship targets that were coupled to the deleted file.
  private runRemovePipeline(filePath: string, stalePaths: string[]): void {
    this.clearFile(filePath);

    if (!this.settings.enableDiagnostics) {
      this.clearPaths(stalePaths);
      return;
    }

    this.structuralPipeline.refreshPaths(stalePaths);
    this.embeddedJavaScriptPipeline.refreshPaths(stalePaths);
    this.embeddedCssPipeline.refreshPaths(stalePaths);
    this.embeddedAspServerTagPipeline.refreshPaths(stalePaths);
    if (isRelevantCodeFile(filePath)) {
      this.compatibilityPipeline.deleteFile(filePath);
    }
  }

  private clearAllCollections(): void {
    this.webFormsCollection.clear();
    this.compatibilityCollection.clear();
    this.embeddedJavaScriptCollection.clear();
    this.embeddedCssCollection.clear();
    this.embeddedAspServerTagCollection.clear();
  }

  private clearFile(filePath: string): void {
    const uri = vscode.Uri.file(filePath);
    this.webFormsCollection.delete(uri);
    this.compatibilityCollection.delete(uri);
    this.embeddedJavaScriptCollection.delete(uri);
    this.embeddedCssCollection.delete(uri);
    this.embeddedAspServerTagCollection.delete(uri);
  }

  private clearPaths(paths: string[]): void {
    for (const path of paths) {
      this.clearFile(path);
    }
  }
}
