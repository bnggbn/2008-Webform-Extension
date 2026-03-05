import { EmbeddedProjectionRegion } from '../../projection/aspxEmbeddedProjection';
import { positionAt } from '../../utils/textUtils';

export function buildEmbeddedRegionDebugLines(
  text: string,
  label: string,
  regions: EmbeddedProjectionRegion[]
): string[] {
  const lines: string[] = [];
  lines.push(`${label} region details: count=${regions.length}`);

  regions.forEach((region, index) => {
    const start = positionAt(text, region.documentStart);
    const end = positionAt(text, region.documentEnd);
    const originalPreview = compactPreview(region.originalText);
    const projectedPreview = compactPreview(region.projectedText);
    lines.push(
      `${label}[${index}] ${region.source}/${region.language} ` +
      `${region.containerTag}${region.attributeName ? `@${region.attributeName}` : ''} ` +
      `L${start.line + 1}:C${start.character + 1}-L${end.line + 1}:C${end.character + 1} ` +
      `hasServerTags=${region.hasServerTags}`
    );
    lines.push(`${label}[${index}] original="${originalPreview}"`);
    lines.push(`${label}[${index}] projected="${projectedPreview}"`);
  });

  return lines;
}

export function buildEmbeddedRegionLineSummary(
  text: string,
  regions: EmbeddedProjectionRegion[]
): string {
  if (regions.length === 0) {
    return 'none';
  }

  return regions
    .map(region => {
      const start = positionAt(text, region.documentStart);
      const end = positionAt(text, region.documentEnd);
      const container = region.attributeName
        ? `${region.containerTag}@${region.attributeName}`
        : region.containerTag;
      return `${container}:${start.line + 1}-${end.line + 1}`;
    })
    .join(', ');
}

function compactPreview(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}
