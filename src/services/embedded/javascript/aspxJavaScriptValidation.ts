import * as ts from 'typescript';
import { EmbeddedProjectionRegion, projectAspxEmbeddedRegions, toDocumentOffset } from '../../../projection/aspxEmbeddedProjection';

export type ProjectedJavaScriptDiagnostic = {
  start: number;
  length: number;
  message: string;
  region: EmbeddedProjectionRegion;
};

export function collectProjectedJavaScriptDiagnostics(documentText: string): ProjectedJavaScriptDiagnostic[] {
  const regions = projectAspxEmbeddedRegions(documentText)
    .filter(region => region.language === 'javascript' && region.hasServerTags);

  return regions.flatMap(region => collectRegionDiagnostics(region));
}

function collectRegionDiagnostics(region: EmbeddedProjectionRegion): ProjectedJavaScriptDiagnostic[] {
  const fileName = region.attributeName ? `${region.containerTag}.${region.attributeName}.js` : `${region.containerTag}.js`;
  const result = ts.transpileModule(
    region.projectedText,
    {
      fileName,
      reportDiagnostics: true,
      compilerOptions: {
        allowJs: true,
        noEmit: true,
        target: ts.ScriptTarget.Latest,
      },
    }
  );

  return (result.diagnostics ?? []).map(diagnostic => {
    const projectedStart = diagnostic.start ?? 0;
    const start = toDocumentOffset(region, projectedStart);
    const length = Math.max(diagnostic.length ?? 1, 1);
    return {
      start,
      length,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      region,
    };
  });
}
