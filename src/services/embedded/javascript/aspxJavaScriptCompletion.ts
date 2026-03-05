import { collectProjectedJavaScriptSymbols, ProjectedJavaScriptSymbol } from './aspxJavaScriptSymbols';
import { flattenSymbols, getJavaScriptTagBodyRegions } from './aspxJavaScriptUtils';

export type ProjectedJavaScriptCompletion = {
  name: string;
  kind: ProjectedJavaScriptSymbol['kind'];
};

export function collectProjectedJavaScriptCompletions(
  documentText: string,
  documentOffset: number
): ProjectedJavaScriptCompletion[] {
  const regions = getJavaScriptTagBodyRegions(documentText);

  const activeRegion = regions.find(region =>
    documentOffset >= region.documentStart && documentOffset <= region.documentEnd
  );
  if (!activeRegion) {
    return [];
  }

  const completions = flattenSymbols(collectProjectedJavaScriptSymbols(documentText))
    .map(symbol => ({
      name: symbol.name,
      kind: symbol.kind,
    }));

  return dedupeByName(completions);
}

function dedupeByName(items: ProjectedJavaScriptCompletion[]): ProjectedJavaScriptCompletion[] {
  const seen = new Set<string>();
  const deduped: ProjectedJavaScriptCompletion[] = [];

  for (const item of items) {
    if (seen.has(item.name)) {
      continue;
    }
    seen.add(item.name);
    deduped.push(item);
  }

  return deduped;
}
