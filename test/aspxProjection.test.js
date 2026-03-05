const test = require('node:test');
const assert = require('node:assert/strict');
const {
  projectAspxEmbeddedRegions,
  toDocumentOffset,
} = require('../dist/projection/aspxEmbeddedProjection.js');
const {
  collectProjectedJavaScriptDiagnostics,
} = require('../dist/projection/aspxJavaScriptValidation.js');
const {
  collectProjectedCssDiagnostics,
} = require('../dist/projection/aspxCssValidation.js');
const {
  collectProjectedJavaScriptSymbols,
} = require('../dist/projection/aspxJavaScriptSymbols.js');
const {
  findProjectedJavaScriptDefinition,
} = require('../dist/projection/aspxJavaScriptDefinitions.js');
const {
  findProjectedJavaScriptHover,
} = require('../dist/projection/aspxJavaScriptHover.js');
const {
  collectProjectedJavaScriptCompletions,
} = require('../dist/projection/aspxJavaScriptCompletion.js');

test('projects script and style regions with ASP.NET tags masked in memory', () => {
  const documentText = [
    '<script>',
    'var x = <%= GetValue() %>;',
    '<% if (condition) { %>',
    '  doSomething();',
    '<% } %>',
    '</script>',
    '<style>',
    '.box { color: <%= GetColor() %>; }',
    '</style>',
  ].join('\n');

  const regions = projectAspxEmbeddedRegions(documentText);
  assert.equal(regions.length, 2);

  const scriptRegion = regions[0];
  assert.equal(scriptRegion.language, 'javascript');
  assert.equal(scriptRegion.source, 'tag-body');
  assert.equal(scriptRegion.originalText.length, scriptRegion.projectedText.length);
  assert.equal(scriptRegion.hasServerTags, true);
  assert.equal(scriptRegion.projectedText.includes('<%'), false);
  assert.match(scriptRegion.projectedText, /var x = null\s*;/);
  assert.match(scriptRegion.projectedText, /doSomething\(\);/);

  const cssRegion = regions[1];
  assert.equal(cssRegion.language, 'css');
  assert.equal(cssRegion.source, 'tag-body');
  assert.equal(cssRegion.originalText.length, cssRegion.projectedText.length);
  assert.equal(cssRegion.hasServerTags, true);
  assert.equal(cssRegion.projectedText.includes('<%'), false);
  assert.match(cssRegion.projectedText, /color:\s*inherit\s*;/);
});

test('skips server-side script tags and keeps document offsets stable', () => {
  const documentText = [
    '<script runat="server">',
    'protected void Page_Load(object sender, EventArgs e) { }',
    '</script>',
    '<script type="text/javascript">',
    'var state = <%= GetState() %>;',
    '</script>',
  ].join('\n');

  const regions = projectAspxEmbeddedRegions(documentText);
  assert.equal(regions.length, 1);
  assert.equal(regions[0].language, 'javascript');

  const projectedOffset = regions[0].projectedText.indexOf('null');
  assert.notEqual(projectedOffset, -1);
  assert.equal(documentText.slice(toDocumentOffset(regions[0], projectedOffset), toDocumentOffset(regions[0], projectedOffset) + 2), '<%');
});

test('recognizes legacy script language attribute and avoids false parse errors after projection', () => {
  const documentText = [
    '<script language="JavaScript">',
    '  <% if (condition) { %>',
    '    doSomething();',
    '  <% } %>',
    '</script>',
  ].join('\n');

  const regions = projectAspxEmbeddedRegions(documentText);
  assert.equal(regions.length, 1);
  assert.equal(regions[0].language, 'javascript');

  const diagnostics = collectProjectedJavaScriptDiagnostics(documentText);
  assert.deepEqual(diagnostics, []);
});

test('reports real JavaScript syntax errors after projection and maps them back to the document', () => {
  const documentText = [
    '<script language="JavaScript">',
    '  <% if (condition) { %>',
    '    brokenCall(;',
    '  <% } %>',
    '</script>',
  ].join('\n');

  const diagnostics = collectProjectedJavaScriptDiagnostics(documentText);
  assert.equal(diagnostics.length > 0, true);
  assert.match(diagnostics[0].message, /Expression expected|'\)' expected|Argument expression expected/);
  assert.equal(documentText[diagnostics[0].start], ';');
});

test('projects event and style attributes that contain ASP.NET server tags', () => {
  const documentText = [
    '<%if (Kind == 2) { %>',
    '  <span class="right">',
    '    <img',
    '      src="./Images/<%=getStyle()%>/superm.jpg"',
    '      style=\'cursor:pointer;color:<%=GetColor()%>;display:none\'',
    '      onclick="if(totalLenSMCheck()){var p2=\'<%=Request.Url.Scheme+\"://\"+Request.Url.Authority %>ajas.aspx\';doSomething(p2);}"',
    '    />',
    '  </span>',
    '<% } %>',
  ].join('\n');

  const regions = projectAspxEmbeddedRegions(documentText);
  assert.equal(regions.length, 2);

  const styleRegion = regions.find(region => region.attributeName === 'style');
  assert.ok(styleRegion);
  assert.equal(styleRegion.language, 'css');
  assert.equal(styleRegion.source, 'attribute');
  assert.equal(styleRegion.projectedText.includes('<%'), false);
  assert.match(styleRegion.projectedText, /color:\s*inherit\s*;/);

  const onclickRegion = regions.find(region => region.attributeName === 'onclick');
  assert.ok(onclickRegion);
  assert.equal(onclickRegion.language, 'javascript');
  assert.equal(onclickRegion.source, 'attribute');
  assert.equal(onclickRegion.projectedText.includes('<%'), false);
  assert.match(onclickRegion.projectedText, /var p2='null\s*ajas\.aspx';/);

  const projectedOffset = onclickRegion.projectedText.indexOf('null');
  assert.notEqual(projectedOffset, -1);
  assert.equal(
    documentText.slice(toDocumentOffset(onclickRegion, projectedOffset), toDocumentOffset(onclickRegion, projectedOffset) + 2),
    '<%'
  );
});

test('avoids false CSS parse errors after projection for style blocks and style attributes', () => {
  const documentText = [
    '<style>',
    '.box { color: <%= GetColor() %>; }',
    '</style>',
    '<div style="background:<%= GetBackground() %>;display:none"></div>',
    '<tr style="<%=getskutypeControler()%>"></tr>',
  ].join('\n');

  const diagnostics = collectProjectedCssDiagnostics(documentText);
  assert.deepEqual(diagnostics, []);
});

test('reports real CSS syntax errors after projection and maps them back to the document', () => {
  const documentText = [
    '<style>',
    '.box { color: <%= GetColor() %>; width red; }',
    '</style>',
    '<div style="width:<%= GetWidth() %>;height:"></div>',
  ].join('\n');

  const diagnostics = collectProjectedCssDiagnostics(documentText);
  assert.equal(diagnostics.length >= 2, true);
  assert.equal(['colon expected', 'property value expected'].includes(diagnostics[0].message), true);
  assert.equal(['r', '"', ';'].includes(documentText[diagnostics[0].start]), true);
});

test('collects local JavaScript symbols from projected script regions', () => {
  const documentText = [
    '<script>',
    'function supermarketControl() {',
    '  var state = 1;',
    '  function nestedHelper() {',
    '    var innerValue = 2;',
    '  }',
    '}',
    '<% if (condition) { %>',
    'function recalulateWC() {',
    '  var visible = true;',
    '}',
    '<% } %>',
    '</script>',
  ].join('\n');

  const symbols = collectProjectedJavaScriptSymbols(documentText);
  assert.equal(symbols.length >= 2, true);
  assert.equal(symbols.some(symbol => symbol.name === 'supermarketControl' && symbol.kind === 'function'), true);
  assert.equal(symbols.some(symbol => symbol.name === 'recalulateWC' && symbol.kind === 'function'), true);

  const supermarket = symbols.find(symbol => symbol.name === 'supermarketControl');
  assert.ok(supermarket);
  assert.equal(supermarket.children.some(child => child.name === 'state' && child.kind === 'variable'), true);
  assert.equal(supermarket.children.some(child => child.name === 'nestedHelper' && child.kind === 'function'), true);
});

test('finds same-file projected JavaScript function definitions', () => {
  const documentText = [
    '<script>',
    'function supermarketControl() {',
    '  return nestedHelper();',
    '}',
    'function nestedHelper() {',
    '  return 1;',
    '}',
    'supermarketControl();',
    '</script>',
  ].join('\n');

  const callOffset = documentText.indexOf('nestedHelper();');
  const nestedDefinition = findProjectedJavaScriptDefinition(documentText, callOffset + 2);
  assert.ok(nestedDefinition);
  assert.equal(nestedDefinition.name, 'nestedHelper');
  assert.equal(documentText.slice(nestedDefinition.targetStart, nestedDefinition.targetEnd), 'nestedHelper');

  const topLevelCallOffset = documentText.lastIndexOf('supermarketControl();');
  const topLevelDefinition = findProjectedJavaScriptDefinition(documentText, topLevelCallOffset + 2);
  assert.ok(topLevelDefinition);
  assert.equal(topLevelDefinition.name, 'supermarketControl');
});

test('finds hover information for projected JavaScript symbols', () => {
  const documentText = [
    '<script>',
    'function supermarketControl() {',
    '  var state = 1;',
    '  return state;',
    '}',
    'supermarketControl();',
    '</script>',
  ].join('\n');

  const functionCallOffset = documentText.lastIndexOf('supermarketControl();') + 3;
  const functionHover = findProjectedJavaScriptHover(documentText, functionCallOffset);
  assert.ok(functionHover);
  assert.equal(functionHover.name, 'supermarketControl');
  assert.equal(functionHover.kind, 'function');

  const variableOffset = documentText.indexOf('state = 1') + 1;
  const variableHover = findProjectedJavaScriptHover(documentText, variableOffset);
  assert.ok(variableHover);
  assert.equal(variableHover.name, 'state');
  assert.equal(variableHover.kind, 'variable');
});

test('collects local JavaScript completions from projected script regions', () => {
  const documentText = [
    '<script>',
    'function supermarketControl() {',
    '  var state = 1;',
    '  return sta',
    '}',
    'function nestedHelper() {}',
    '</script>',
  ].join('\n');

  const completions = collectProjectedJavaScriptCompletions(documentText, documentText.indexOf('sta') + 2);
  assert.equal(completions.some(item => item.name === 'supermarketControl' && item.kind === 'function'), true);
  assert.equal(completions.some(item => item.name === 'state' && item.kind === 'variable'), true);
  assert.equal(completions.some(item => item.name === 'nestedHelper' && item.kind === 'function'), true);
});
