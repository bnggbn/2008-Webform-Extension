import { EmbeddedProjectionRegion, projectAspxEmbeddedRegions, toDocumentOffset } from './aspxEmbeddedProjection';

export type ProjectedAspxServerTagDiagnostic = {
  start: number;
  length: number;
  message: string;
  region: EmbeddedProjectionRegion;
};

export function collectProjectedAspxServerTagDiagnostics(documentText: string): ProjectedAspxServerTagDiagnostic[] {
  const regions = projectAspxEmbeddedRegions(documentText);
  return regions.flatMap(region => collectRegionDiagnostics(region));
}

function collectRegionDiagnostics(region: EmbeddedProjectionRegion): ProjectedAspxServerTagDiagnostic[] {
  const diagnostics: ProjectedAspxServerTagDiagnostic[] = [];
  const text = region.originalText;
  let cursor = 0;

  while (cursor < text.length) {
    const tagStart = text.indexOf('<%', cursor);
    if (tagStart < 0) {
      break;
    }

    if (text.startsWith('<%--', tagStart)) {
      const commentEnd = text.indexOf('--%>', tagStart + 4);
      if (commentEnd < 0) {
        diagnostics.push(createDiagnostic(region, tagStart, 4, "'--%>' expected to close ASP comment."));
        break;
      }
      cursor = commentEnd + 4;
      continue;
    }

    const tagEnd = text.indexOf('%>', tagStart + 2);
    if (tagEnd < 0) {
      diagnostics.push(createDiagnostic(region, tagStart, 2, "'%>' expected to close ASP server tag."));
      break;
    }

    cursor = tagEnd + 2;
  }

  return diagnostics;
}

function createDiagnostic(
  region: EmbeddedProjectionRegion,
  projectedStart: number,
  length: number,
  message: string
): ProjectedAspxServerTagDiagnostic {
  return {
    start: toDocumentOffset(region, projectedStart),
    length,
    message,
    region,
  };
}
