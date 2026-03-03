const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CompatibilityFeature,
  getEffectiveLanguageVersion,
  isFeatureSupported,
} = require('../dist/diagnostics/compatibility/compatibilityCore.js');
const {
  findInterpolatedStrings,
  findNameofExpressions,
  findNullConditionalOperators,
} = require('../dist/diagnostics/compatibility/compatibilitySyntaxFinders.js');

function createSettings(profile, csharpLanguageVersion = '') {
  return {
    enableCodeLens: true,
    enableDiagnostics: true,
    includeGlobs: [],
    excludeGlobs: [],
    includeGlobsPattern: '',
    excludeGlobsPattern: '',
    compatibility: {
      profile,
      csharpLanguageVersion,
    },
    rules: {
      missingCodeFile: 'warning',
      missingDesigner: 'information',
      missingInherits: 'warning',
      unsupportedStringInterpolation: 'error',
      unsupportedNameofExpression: 'error',
      unsupportedNullConditionalAccess: 'error',
    },
  };
}

test('compatibility profiles map to expected language versions', () => {
  assert.equal(getEffectiveLanguageVersion(createSettings('vs2008')), 3);
  assert.equal(getEffectiveLanguageVersion(createSettings('vs2010')), 4);
  assert.equal(getEffectiveLanguageVersion(createSettings('vs2015')), 6);
  assert.equal(getEffectiveLanguageVersion(createSettings('custom', '4.0')), 4);
});

test('feature support is determined by the profile table', () => {
  assert.equal(isFeatureSupported(createSettings('vs2008'), CompatibilityFeature.StringInterpolation), false);
  assert.equal(isFeatureSupported(createSettings('vs2015'), CompatibilityFeature.StringInterpolation), true);
  assert.equal(isFeatureSupported(createSettings('custom', '5.0'), CompatibilityFeature.NameofExpression), false);
  assert.equal(isFeatureSupported(createSettings('custom', '6.0'), CompatibilityFeature.NullConditionalAccess), true);
});

test('string interpolation finder ignores comments and plain strings', () => {
  const text = [
    'var a = $"value={x}";',
    'var b = "$notInterpolated";',
    '// var c = $"ignored";',
    '/* var d = $"ignoredToo"; */',
  ].join('\n');

  assert.deepEqual(findInterpolatedStrings(text), [8]);
});

test('nameof finder ignores identifiers in comments and strings', () => {
  const text = [
    'var a = nameof(Customer);',
    'var b = "nameof(text)";',
    '// nameof(CommentedOut)',
  ].join('\n');

  assert.deepEqual(findNameofExpressions(text), [8]);
});

test('null-conditional finder detects ?. and ?[] but skips unrelated tokens', () => {
  const text = [
    'var a = customer?.Name;',
    'var b = items?[0];',
    'var c = value ?? fallback;',
    'var d = list ? [0] : 1;',
    '// var e = ignored?.Name;',
  ].join('\n');

  assert.deepEqual(findNullConditionalOperators(text), [16, 37]);
});
