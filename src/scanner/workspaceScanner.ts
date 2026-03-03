import * as fs from 'fs';
import * as vscode from 'vscode';
import { WebFormsSettings } from '../config/settings';
import { parseDirectiveInfo } from '../parser/directiveParser';
import { resolveWebFormEntry } from '../resolver/relationshipResolver';
import { WebFormEntry } from '../models/webFormEntry';
import { isMarkupFile, isRelevantCodeFile } from '../utils/pathUtils';

export class WorkspaceScanner {
  private readonly byMarkup = new Map<string, WebFormEntry>();
  private readonly byCodeBehind = new Map<string, WebFormEntry>();
  private readonly byDesigner = new Map<string, WebFormEntry>();
  private readonly knownCodeFiles = new Set<string>();

  constructor(private readonly settings: WebFormsSettings) {}

  async refresh(): Promise<void> {
    this.byMarkup.clear();
    this.byCodeBehind.clear();
    this.byDesigner.clear();
    this.knownCodeFiles.clear();

    for (const folder of vscode.workspace.workspaceFolders || []) {
      const files = await this.collectFiles(folder);

      for (const filePath of files) {
        if (isRelevantCodeFile(filePath)) {
          this.knownCodeFiles.add(filePath);
        }
        const entry = this.buildEntry(filePath);
        if (entry) {
          this.indexEntry(entry);
        }
      }
    }
  }

  refreshFile(filePath: string): void {
    this.trackCodeFile(filePath, true);
    const impacted = this.collectImpactedPaths(filePath);
    for (const impactedPath of impacted) {
      this.removeIndexesForPath(impactedPath);
    }

    const rebuildTargets = new Set<string>();
    for (const impactedPath of impacted) {
      const rebuilt = this.buildEntry(impactedPath);
      if (rebuilt?.markupPath) {
        rebuildTargets.add(rebuilt.markupPath);
      }
    }

    if (isMarkupFile(filePath) || isRelevantCodeFile(filePath)) {
      const direct = this.buildEntry(filePath);
      if (direct?.markupPath) {
        rebuildTargets.add(direct.markupPath);
      }
    }

    for (const markupPath of rebuildTargets) {
      const entry = this.buildEntry(markupPath);
      if (entry) {
        this.indexEntry(entry);
      }
    }
  }

  removeFile(filePath: string): void {
    this.trackCodeFile(filePath, false);
    const impacted = this.collectImpactedPaths(filePath);
    for (const impactedPath of impacted) {
      this.removeIndexesForPath(impactedPath);
    }

    for (const impactedPath of impacted) {
      if (impactedPath.toLowerCase() === filePath.toLowerCase()) {
        continue;
      }

      const entry = this.buildEntry(impactedPath);
      if (entry) {
        this.indexEntry(entry);
      }
    }
  }

  getEntryForFile(filePath: string): WebFormEntry | undefined {
    const normalized = filePath.toLowerCase();
    return this.byMarkup.get(normalized)
      || this.byCodeBehind.get(normalized)
      || this.byDesigner.get(normalized)
      || this.buildEntry(filePath);
  }

  getAllEntries(): WebFormEntry[] {
    return Array.from(this.byMarkup.values());
  }

  getAllCodeFilePaths(): string[] {
    return Array.from(this.knownCodeFiles.values());
  }

  getImpactedPaths(filePath: string): string[] {
    return this.collectImpactedPaths(filePath);
  }

  private buildEntry(filePath: string): WebFormEntry | undefined {
    if (isMarkupFile(filePath)) {
      if (!fs.existsSync(filePath)) {
        return undefined;
      }
      const markup = fs.readFileSync(filePath, 'utf8');
      const directive = parseDirectiveInfo(markup, filePath);
      const entry = resolveWebFormEntry(filePath, directive);
      return entry ? this.enrichEntry(entry) : undefined;
    }

    const entry = resolveWebFormEntry(filePath);
    return entry ? this.enrichEntry(entry) : undefined;
  }

  private async collectFiles(folder: vscode.WorkspaceFolder): Promise<string[]> {
    const uris = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, this.settings.includeGlobsPattern),
      this.settings.excludeGlobsPattern
    );

    return uris
      .map(uri => uri.fsPath)
      .filter(filePath => (isMarkupFile(filePath) || isRelevantCodeFile(filePath)) && !this.shouldSkipCodeFile(filePath));
  }

  private shouldSkipCodeFile(filePath: string): boolean {
    const lower = filePath.replace(/\//g, '\\').toLowerCase();
    return (
      lower.endsWith('.g.cs') ||
      lower.endsWith('.g.i.cs') ||
      lower.endsWith('assemblyinfo.cs') ||
      lower.endsWith('.designer.cs.cs') ||
      lower.includes('\\obj\\') ||
      lower.includes('\\bin\\')
    );
  }

  private indexEntry(entry: WebFormEntry): void {
    this.byMarkup.set(entry.markupPath.toLowerCase(), entry);

    if (entry.codeBehindPath) {
      this.byCodeBehind.set(entry.codeBehindPath.toLowerCase(), entry);
    }

    if (entry.designerPath) {
      this.byDesigner.set(entry.designerPath.toLowerCase(), entry);
    }
  }

  private enrichEntry(entry: WebFormEntry): WebFormEntry {
    return {
      ...entry,
      designerFieldNames: this.readDesignerFieldNames(entry.designerPath),
    };
  }

  private readDesignerFieldNames(designerPath: string | undefined): string[] {
    if (!designerPath || !fs.existsSync(designerPath)) {
      return [];
    }

    const text = fs.readFileSync(designerPath, 'utf8');
    const matches = text.matchAll(/\b(?:protected|public|private|internal)\s+(?:global::)?[\w.<>,]+\s+(\w+)\s*;/g);
    const fields = new Set<string>();
    for (const match of matches) {
      if (match[1]) fields.add(match[1]);
    }
    return Array.from(fields);
  }

  private collectImpactedPaths(filePath: string): string[] {
    const normalized = filePath.toLowerCase();
    const existing = this.byMarkup.get(normalized)
      || this.byCodeBehind.get(normalized)
      || this.byDesigner.get(normalized);

    if (!existing) {
      return [filePath];
    }

    return [existing.markupPath, existing.codeBehindPath, existing.designerPath]
      .filter((value): value is string => !!value);
  }

  private removeIndexesForPath(filePath: string): void {
    const normalized = filePath.toLowerCase();
    const entry = this.byMarkup.get(normalized)
      || this.byCodeBehind.get(normalized)
      || this.byDesigner.get(normalized);

    if (!entry) return;

    this.byMarkup.delete(entry.markupPath.toLowerCase());
    if (entry.codeBehindPath) {
      this.byCodeBehind.delete(entry.codeBehindPath.toLowerCase());
    }
    if (entry.designerPath) {
      this.byDesigner.delete(entry.designerPath.toLowerCase());
    }
  }

  private trackCodeFile(filePath: string, present: boolean): void {
    if (!isRelevantCodeFile(filePath) || this.shouldSkipCodeFile(filePath)) {
      return;
    }

    if (present) {
      this.knownCodeFiles.add(filePath);
      return;
    }

    this.knownCodeFiles.delete(filePath);
  }
}
