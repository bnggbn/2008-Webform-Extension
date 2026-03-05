import * as ts from 'typescript';
import { toDocumentOffset } from '../../../projection/aspxEmbeddedProjection';
import { getJavaScriptTagBodyRegions, readIdentifierAtOffset } from './aspxJavaScriptUtils';

export type ProjectedJavaScriptDefinition = {
  name: string;
  targetStart: number;
  targetEnd: number;
};

export function findProjectedJavaScriptDefinition(
  documentText: string,
  documentOffset: number
): ProjectedJavaScriptDefinition | undefined {
  const regions = getJavaScriptTagBodyRegions(documentText);

  const activeRegion = regions.find(region =>
    documentOffset >= region.documentStart && documentOffset <= region.documentEnd
  );
  if (!activeRegion) {
    return undefined;
  }

  const identifier = readIdentifierAtOffset(documentText, documentOffset);
  if (!identifier) {
    return undefined;
  }

  const definitions = regions.flatMap(region => collectDefinitions(region));
  const candidates = definitions.filter(definition => definition.name === identifier);
  if (candidates.length === 0) {
    return undefined;
  }

  // Prefer definitions declared before the reference offset.
  const before = candidates
    .filter(candidate => candidate.targetStart <= documentOffset)
    .sort((left, right) => right.targetStart - left.targetStart);
  if (before.length > 0) {
    const { name, targetStart, targetEnd } = before[0];
    return { name, targetStart, targetEnd };
  }

  const [fallback] = candidates.sort((left, right) => left.targetStart - right.targetStart);
  return {
    name: fallback.name,
    targetStart: fallback.targetStart,
    targetEnd: fallback.targetEnd,
  };
}

export function findProjectedJavaScriptDefinitionByName(
  documentText: string,
  identifier: string
): ProjectedJavaScriptDefinition | undefined {
  if (!identifier) {
    return undefined;
  }

  const definitions = getJavaScriptTagBodyRegions(documentText)
    .flatMap(region => collectDefinitions(region))
    .filter(definition => definition.name === identifier)
    .sort((left, right) => left.targetStart - right.targetStart);

  if (definitions.length === 0) {
    return undefined;
  }

  const [first] = definitions;
  return {
    name: first.name,
    targetStart: first.targetStart,
    targetEnd: first.targetEnd,
  };
}

type InternalDefinition = ProjectedJavaScriptDefinition & {
  kind: 'function' | 'variable' | 'parameter';
};

function collectDefinitions(region: ReturnType<typeof getJavaScriptTagBodyRegions>[number]): InternalDefinition[] {
  const sourceFile = ts.createSourceFile(
    `${region.containerTag}.projected.js`,
    region.projectedText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );

  const definitions: InternalDefinition[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      definitions.push({
        kind: 'function',
        name: node.name.text,
        targetStart: toDocumentOffset(region, node.name.getStart()),
        targetEnd: toDocumentOffset(region, node.name.end),
      });
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      definitions.push({
        kind: 'variable',
        name: node.name.text,
        targetStart: toDocumentOffset(region, node.name.getStart()),
        targetEnd: toDocumentOffset(region, node.name.end),
      });
    }

    if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      definitions.push({
        kind: 'parameter',
        name: node.name.text,
        targetStart: toDocumentOffset(region, node.name.getStart()),
        targetEnd: toDocumentOffset(region, node.name.end),
      });
    }

    node.forEachChild(visit);
  };

  sourceFile.forEachChild(visit);
  return definitions;
}
