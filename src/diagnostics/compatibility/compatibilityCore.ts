import { CompatibilityProfile, WebFormsSettings } from '../../config/settings';

type CompatibilityProfileDefinition = {
  csharpLanguageVersion: number;
  displayName: string;
};

export enum CompatibilityFeature {
  StringInterpolation = 'stringInterpolation',
  NameofExpression = 'nameofExpression',
  NullConditionalAccess = 'nullConditionalAccess',
}

const COMPATIBILITY_PROFILES: Record<Exclude<CompatibilityProfile, 'custom'>, CompatibilityProfileDefinition> = {
  vs2005: { csharpLanguageVersion: 2, displayName: 'Visual Studio 2005 / C# 2.0' },
  vs2008: { csharpLanguageVersion: 3, displayName: 'Visual Studio 2008 / C# 3.0' },
  vs2010: { csharpLanguageVersion: 4, displayName: 'Visual Studio 2010 / C# 4.0' },
  vs2012: { csharpLanguageVersion: 5, displayName: 'Visual Studio 2012 / C# 5.0' },
  vs2013: { csharpLanguageVersion: 5, displayName: 'Visual Studio 2013 / C# 5.0' },
  vs2015: { csharpLanguageVersion: 6, displayName: 'Visual Studio 2015 / C# 6.0' },
};

const FEATURE_MINIMUM_LANGUAGE_VERSION: Record<CompatibilityFeature, number> = {
  [CompatibilityFeature.StringInterpolation]: 6,
  [CompatibilityFeature.NameofExpression]: 6,
  [CompatibilityFeature.NullConditionalAccess]: 6,
};

export function getCompatibilityProfile(settings: WebFormsSettings): CompatibilityProfileDefinition | undefined {
  if (settings.compatibility.profile === 'custom') {
    const version = parseCustomLanguageVersion(settings.compatibility.csharpLanguageVersion);
    if (!version) {
      return undefined;
    }

    return {
      csharpLanguageVersion: version,
      displayName: `Custom / C# ${settings.compatibility.csharpLanguageVersion.trim()}`,
    };
  }

  return COMPATIBILITY_PROFILES[settings.compatibility.profile];
}

export function getEffectiveLanguageVersion(settings: WebFormsSettings): number | undefined {
  return getCompatibilityProfile(settings)?.csharpLanguageVersion;
}

export function isFeatureSupported(settings: WebFormsSettings, feature: CompatibilityFeature): boolean {
  const version = getEffectiveLanguageVersion(settings);
  if (!version) {
    return false;
  }

  return version >= FEATURE_MINIMUM_LANGUAGE_VERSION[feature];
}

export function scanCode(text: string, visitor: (index: number) => boolean | void): void {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '/' && next === '/') {
      i = skipLineComment(text, i + 2);
      continue;
    }
    if (ch === '/' && next === '*') {
      i = skipBlockComment(text, i + 2);
      continue;
    }
    if (ch === '@' && next === '"') {
      i = skipVerbatimString(text, i + 2);
      continue;
    }
    if (ch === '"') {
      i = skipRegularString(text, i + 1);
      continue;
    }
    if (ch === '\'') {
      i = skipCharacterLiteral(text, i + 1);
      continue;
    }
    if (ch === '$' && next === '@' && text[i + 2] === '"') {
      if (visitor(i) === false) return;
      i = skipInterpolatedString(text, i + 3, true);
      continue;
    }
    if (ch === '@' && next === '$' && text[i + 2] === '"') {
      if (visitor(i + 1) === false) return;
      i = skipInterpolatedString(text, i + 3, true);
      continue;
    }
    if (ch === '$' && next === '"') {
      if (visitor(i) === false) return;
      i = skipInterpolatedString(text, i + 2, false);
      continue;
    }
    if (visitor(i) === false) return;
  }
}

function parseCustomLanguageVersion(rawValue: string): number | undefined {
  const raw = rawValue.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === 'default' || raw === 'latest') return Number.MAX_SAFE_INTEGER;
  const numeric = Number.parseFloat(raw.replace(/^v/i, ''));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function skipLineComment(text: string, index: number): number {
  while (index < text.length && text[index] !== '\n') index++;
  return index;
}

function skipBlockComment(text: string, index: number): number {
  while (index < text.length - 1) {
    if (text[index] === '*' && text[index + 1] === '/') return index + 1;
    index++;
  }
  return text.length;
}

function skipRegularString(text: string, index: number): number {
  while (index < text.length) {
    if (text[index] === '\\') {
      index += 2;
      continue;
    }
    if (text[index] === '"') return index;
    index++;
  }
  return text.length;
}

function skipVerbatimString(text: string, index: number): number {
  while (index < text.length) {
    if (text[index] === '"' && text[index + 1] === '"') {
      index += 2;
      continue;
    }
    if (text[index] === '"') return index;
    index++;
  }
  return text.length;
}

function skipCharacterLiteral(text: string, index: number): number {
  while (index < text.length) {
    if (text[index] === '\\') {
      index += 2;
      continue;
    }
    if (text[index] === '\'') return index;
    index++;
  }
  return text.length;
}

function skipInterpolatedString(text: string, index: number, verbatim: boolean): number {
  while (index < text.length) {
    const ch = text[index];
    const next = text[index + 1];
    if (ch === '{' && next === '{') {
      index += 2;
      continue;
    }
    if (ch === '}' && next === '}') {
      index += 2;
      continue;
    }
    if (ch === '{') {
      index = skipInterpolationExpression(text, index + 1);
      continue;
    }
    if (verbatim) {
      if (ch === '"' && next === '"') {
        index += 2;
        continue;
      }
      if (ch === '"') return index;
      index++;
      continue;
    }
    if (ch === '\\') {
      index += 2;
      continue;
    }
    if (ch === '"') return index;
    index++;
  }
  return text.length;
}

function skipInterpolationExpression(text: string, index: number): number {
  let depth = 1;
  while (index < text.length && depth > 0) {
    const ch = text[index];
    const next = text[index + 1];
    if (ch === '/' && next === '/') {
      index = skipLineComment(text, index + 2);
      continue;
    }
    if (ch === '/' && next === '*') {
      index = skipBlockComment(text, index + 2);
      continue;
    }
    if (ch === '@' && next === '"') {
      index = skipVerbatimString(text, index + 2) + 1;
      continue;
    }
    if (ch === '"') {
      index = skipRegularString(text, index + 1) + 1;
      continue;
    }
    if (ch === '\'') {
      index = skipCharacterLiteral(text, index + 1) + 1;
      continue;
    }
    if (ch === '{') {
      depth++;
      index++;
      continue;
    }
    if (ch === '}') {
      depth--;
      index++;
      continue;
    }
    index++;
  }
  return index;
}
