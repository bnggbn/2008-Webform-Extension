# WebForms Helper for VS2008

VS Code extension prototype for legacy ASP.NET WebForms / WebSite projects.

Current features:

- WebForms related-file navigation
- structural diagnostics for common WebForms file relationship issues
- legacy C# compatibility diagnostics for syntax that Roslyn may not flag when targeting older environments
- custom `webforms-aspx` language takeover for `.aspx`, `.ascx`, and `.master`
- ASPX single grammar for ASP.NET server tags in HTML/JS/CSS contexts (no injection grammar)
- WebForms ASPX snippets for common directives and server controls
- in-memory ASPX embedded-region projection for JS/CSS-aware analysis with stable offset mapping
- embedded JavaScript parse diagnostics for server-tag-heavy script/attribute regions
- embedded CSS parse diagnostics for server-tag-heavy style/attribute regions (custom hand-written CSS validator)
- embedded JavaScript document symbols (Outline), same-file definition lookup, and hover
- debug logging for embedded language diagnostics (`webformsHelper.debug.embeddedLanguageLogs`)

Current commands:

- `WebForms: Go to Code Behind`
- `WebForms: Go to Markup`
- `WebForms: Go to Designer`
- `WebForms: Refresh Relationships`

## Embedded JavaScript Features

Current embedded JavaScript editor features on `.aspx` / `.ascx` / `.master` (registered via `**/*.{aspx,ascx,master,ashx,asmx}` document filter):

- parse diagnostics for projected JS regions that contain server tags
- document symbols for local functions/variables in embedded script blocks
- same-file definition lookup (`F12`) for projected symbols
- hover for projected symbols

Note:

- completion provider code exists but is intentionally not registered (import not present in `extension.ts`) to avoid noisy auto-popup behavior in legacy maintenance workflows.

## Compatibility Diagnostics

The extension can flag newer C# syntax that is invalid in older Visual Studio / C# language environments.

Currently supported compatibility rules:

- string interpolation: `$"..."`
- `nameof(...)`
- null-conditional access: `?.` and `?[]`

### Compatibility Profiles

Use `webformsHelper.compatibility.profile` to select a legacy environment profile:

- `vs2005` -> C# 2.0
- `vs2008` -> C# 3.0
- `vs2010` -> C# 4.0
- `vs2012` -> C# 5.0
- `vs2013` -> C# 5.0
- `vs2015` -> C# 6.0
- `custom` -> use `webformsHelper.compatibility.csharpLanguageVersion`

Example workspace settings:

```json
{
  "webformsHelper.compatibility.profile": "vs2008",
  "webformsHelper.rules.unsupportedStringInterpolation": "error",
  "webformsHelper.rules.unsupportedNameofExpression": "error",
  "webformsHelper.rules.unsupportedNullConditionalAccess": "error",
  "webformsHelper.rules.embeddedJavaScriptParseError": "warning",
  "webformsHelper.rules.embeddedCssParseError": "warning"
}
```

Custom language version example:

```json
{
  "webformsHelper.compatibility.profile": "custom",
  "webformsHelper.compatibility.csharpLanguageVersion": "4.0"
}
```

## Structural Diagnostics

Current structural diagnostics:

- missing code-behind file
- missing designer file
- missing `Inherits`

## Syntax and Snippets

- custom grammar: `syntaxes/webforms-aspx.tmLanguage.json`
- snippet bundle: `snippets/webforms-aspx.code-snippets`

Known limitation:

- TextMate scope interactions in mixed ASPX + embedded JS/CSS strings can still require iterative tuning on real-world legacy markup patterns.
- Current mitigation: inside quoted JS/CSS/HTML segments containing server tags, ASP patterns are matched first, then only non-ASP text is assigned string scope.

## Development

```bash
npm install
npm run build
```

Then press `F5` in VS Code to launch the Extension Development Host.
