import * as ts from 'typescript';
import { EmbeddedProjectionRegion, toDocumentOffset } from '../../../projection/aspxEmbeddedProjection';
import { getJavaScriptTagBodyRegions } from './aspxJavaScriptUtils';

export type ProjectedJavaScriptSymbolKind = 'function' | 'variable';

export type ProjectedJavaScriptSymbol = {
  name: string;
  kind: ProjectedJavaScriptSymbolKind;
  start: number;
  end: number;
  selectionStart: number;
  selectionEnd: number;
  children: ProjectedJavaScriptSymbol[];
};

export function collectProjectedJavaScriptSymbols(documentText: string): ProjectedJavaScriptSymbol[] {
  return getJavaScriptTagBodyRegions(documentText).flatMap(region => collectRegionSymbols(region));
}

function collectRegionSymbols(region: EmbeddedProjectionRegion): ProjectedJavaScriptSymbol[] {
  const sourceFile = ts.createSourceFile(
    `${region.containerTag}.projected.js`,
    region.projectedText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );

  return collectChildSymbols(sourceFile, region);
}

function collectChildSymbols(node: ts.Node, region: EmbeddedProjectionRegion): ProjectedJavaScriptSymbol[] {
  const symbols: ProjectedJavaScriptSymbol[] = [];

  node.forEachChild(child => {
    const symbol = createSymbol(child, region);
    if (symbol) {
      symbols.push(symbol);
      return;
    }

    symbols.push(...collectChildSymbols(child, region));
  });

  return symbols;
}

function createSymbol(node: ts.Node, region: EmbeddedProjectionRegion): ProjectedJavaScriptSymbol | undefined {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return {
      name: node.name.text,
      kind: 'function',
      start: toDocumentOffset(region, node.getStart()),
      end: toDocumentOffset(region, node.end),
      selectionStart: toDocumentOffset(region, node.name.getStart()),
      selectionEnd: toDocumentOffset(region, node.name.end),
      children: node.body ? collectChildSymbols(node.body, region) : [],
    };
  }

  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return {
      name: node.name.text,
      kind: 'variable',
      start: toDocumentOffset(region, node.getStart()),
      end: toDocumentOffset(region, node.end),
      selectionStart: toDocumentOffset(region, node.name.getStart()),
      selectionEnd: toDocumentOffset(region, node.name.end),
      children: [],
    };
  }

  return undefined;
}
