import * as ts from 'typescript';
import { toDocumentOffset } from './aspxEmbeddedProjection';
import { getJavaScriptTagBodyRegions, isIdentifierChar, readIdentifierAtOffset } from './aspxJavaScriptUtils';

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

  const definitions = regions.flatMap(region => collectFunctionDefinitions(region));
  return definitions.find(definition => definition.name === identifier);
}

function collectFunctionDefinitions(region: ReturnType<typeof getJavaScriptTagBodyRegions>[number]): ProjectedJavaScriptDefinition[] {
  const sourceFile = ts.createSourceFile(
    `${region.containerTag}.projected.js`,
    region.projectedText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );

  const definitions: ProjectedJavaScriptDefinition[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      definitions.push({
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
