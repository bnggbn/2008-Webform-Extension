import { collectProjectedJavaScriptSymbols, ProjectedJavaScriptSymbol } from './aspxJavaScriptSymbols';
import { flattenSymbols, getJavaScriptTagBodyRegions, readIdentifierAtOffset } from './aspxJavaScriptUtils';

export type ProjectedJavaScriptHover = {
  name: string;
  kind: ProjectedJavaScriptSymbol['kind'];
  start: number;
  end: number;
};

export function findProjectedJavaScriptHover(
  documentText: string,
  documentOffset: number
): ProjectedJavaScriptHover | undefined {
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

  const symbol = flattenSymbols(collectProjectedJavaScriptSymbols(documentText))
    .find(candidate => candidate.name === identifier);
  if (!symbol) {
    return undefined;
  }

  return {
    name: symbol.name,
    kind: symbol.kind,
    start: symbol.selectionStart,
    end: symbol.selectionEnd,
  };
}
