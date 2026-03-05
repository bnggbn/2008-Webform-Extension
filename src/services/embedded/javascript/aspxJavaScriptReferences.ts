import * as ts from 'typescript';
import { toDocumentOffset } from '../../../projection/aspxEmbeddedProjection';
import { getJavaScriptTagBodyRegions, readIdentifierAtOffset } from './aspxJavaScriptUtils';

export type ProjectedJavaScriptReference = {
  name: string;
  start: number;
  end: number;
  isDeclaration: boolean;
};

export function collectProjectedJavaScriptReferences(
  documentText: string,
  documentOffset: number
): ProjectedJavaScriptReference[] {
  const regions = getJavaScriptTagBodyRegions(documentText);
  const activeRegion = regions.find(region =>
    documentOffset >= region.documentStart && documentOffset <= region.documentEnd
  );
  if (!activeRegion) {
    return [];
  }

  const identifier = readIdentifierAtOffset(documentText, documentOffset);
  if (!identifier) {
    return [];
  }

  const references = regions.flatMap(region => collectRegionReferences(region, identifier));
  references.sort((left, right) => left.start - right.start);
  return dedupeReferences(references);
}

export function collectProjectedJavaScriptReferencesByName(
  documentText: string,
  identifier: string
): ProjectedJavaScriptReference[] {
  if (!identifier) {
    return [];
  }

  const references = getJavaScriptTagBodyRegions(documentText)
    .flatMap(region => collectRegionReferences(region, identifier))
    .sort((left, right) => left.start - right.start);

  return dedupeReferences(references);
}

function collectRegionReferences(
  region: ReturnType<typeof getJavaScriptTagBodyRegions>[number],
  targetName: string
): ProjectedJavaScriptReference[] {
  const sourceFile = ts.createSourceFile(
    `${region.containerTag}.projected.js`,
    region.projectedText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );

  const references: ProjectedJavaScriptReference[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === targetName && shouldTrackIdentifier(node)) {
      references.push({
        name: targetName,
        start: toDocumentOffset(region, node.getStart()),
        end: toDocumentOffset(region, node.end),
        isDeclaration: isDeclarationIdentifier(node),
      });
    }
    node.forEachChild(visit);
  };

  sourceFile.forEachChild(visit);
  return references;
}

function shouldTrackIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) {
    return true;
  }

  // Skip member/property names like obj.name and object literal keys.
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }
  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return false;
  }
  if (ts.isPropertyDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isMethodDeclaration(parent) && parent.name === node) {
    return false;
  }

  return true;
}

function isDeclarationIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) {
    return false;
  }

  if (ts.isFunctionDeclaration(parent) && parent.name === node) {
    return true;
  }
  if (ts.isVariableDeclaration(parent) && parent.name === node) {
    return true;
  }
  if (ts.isParameter(parent) && parent.name === node) {
    return true;
  }

  return false;
}

function dedupeReferences(references: ProjectedJavaScriptReference[]): ProjectedJavaScriptReference[] {
  const seen = new Set<string>();
  const output: ProjectedJavaScriptReference[] = [];
  for (const reference of references) {
    const key = `${reference.start}:${reference.end}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(reference);
  }
  return output;
}
