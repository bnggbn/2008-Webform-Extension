import { EmbeddedLanguage } from './types';
import { readAttribute } from './htmlOpenTagParser';

const JAVASCRIPT_TYPES = new Set([
  'text/javascript',
  'application/javascript',
  'application/ecmascript',
  'text/ecmascript',
  'module',
]);

const JAVASCRIPT_LANGUAGES = new Set([
  'javascript',
  'jscript',
  'ecmascript',
  'js',
]);

export function shouldProjectTag(tagName: 'script' | 'style', openTag: string): boolean {
  if (/\brunat\s*=\s*(['"]?)server\1/i.test(openTag)) {
    return false;
  }

  if (tagName === 'style') {
    return true;
  }

  const typeValue = readAttribute(openTag, 'type')?.toLowerCase();
  if (typeValue) {
    return JAVASCRIPT_TYPES.has(typeValue);
  }

  const languageValue = readAttribute(openTag, 'language')?.toLowerCase();
  if (languageValue) {
    return JAVASCRIPT_LANGUAGES.has(languageValue);
  }

  return true;
}

export function getAttributeLanguage(attributeName: string): EmbeddedLanguage | undefined {
  if (attributeName === 'style') {
    return 'css';
  }

  if (attributeName.startsWith('on')) {
    return 'javascript';
  }

  return undefined;
}
