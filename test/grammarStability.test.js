const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const grammarPath = path.join(__dirname, '..', 'syntaxes', 'webforms-aspx.tmLanguage.json');

test('grammar keeps event-handler interception rule for onclick/onchange styling stability', () => {
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));

  assert.ok(grammar.repository.tagWithEventHandler);
  assert.equal(grammar.repository.tagWithEventHandler.begin.includes('on[A-Za-z0-9_:-]'), true);

  const handlerPatterns = grammar.repository.tagWithEventHandler.patterns || [];
  const hasEmbeddedJsPattern = handlerPatterns.some(pattern => pattern.contentName === 'source.js.embedded.html');
  assert.equal(hasEmbeddedJsPattern, true);
});

test('grammar keeps prefixed tag support for asp:* controls', () => {
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
  assert.ok(grammar.repository.prefixedTag);
  assert.equal(grammar.repository.prefixedTag.begin.includes('[A-Za-z][\\w.-]*:[A-Za-z][\\w.-]*'), true);
});

test('grammar keeps string fragment rule that excludes closing quote when ASP is embedded', () => {
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));

  const scriptPatterns = grammar.repository.scriptBlock.patterns || [];
  const doubleQuotedAspStringPattern = scriptPatterns.find(pattern => pattern.begin === '"(?=[^"\\n]*<%)');
  assert.ok(doubleQuotedAspStringPattern);

  const nestedPatterns = doubleQuotedAspStringPattern.patterns || [];
  const hasSafeFragmentRule = nestedPatterns.some(pattern => pattern.match === '[^<"\\n]+');
  assert.equal(hasSafeFragmentRule, true);
});
