# Changelog

All notable changes to **WebForms Helper for VS2008** will be documented in this file.

## [Unreleased]

---

## [0.0.5] — 2026-03-05

### Added
- **ASP server tag diagnostics** — detects unclosed `<% %>` server tags inside ASPX markup (`aspxUnclosedServerTag`)
- **Find References** for embedded JavaScript inside `<script>` blocks
- **Go-to-definition across external `.js` files** — definition provider now resolves symbols in referenced script files, not only within the same ASPX document
- **Grammar** — three new rules covering WebForms-specific HTML patterns:
  - `tagWithEventHandler` — embeds JavaScript inside `onXxx="..."` event attributes
  - `prefixedTag` — syntax for `<asp:xxx>` / `<cc:xxx>` server control tags
  - `tagWithAspBlock` — handles `<% %>` expressions inside HTML attribute values
- **Grammar** — lookahead-based JS string interception in `scriptBlock`: `<%=...%>` inside JS string literals is now correctly highlighted (e.g., `getElementById('<%=Txt.ClientID%>')`)
- Grammar stability test suite

### Changed
- Embedded JS/CSS diagnostic pipelines refactored from abstract-base-class inheritance to `EmbeddedDiagnosticsRunner` composition
- JavaScript services reorganised from `src/projection/` into `src/services/embedded/` — cleaner separation between projection and service layers

---

## [0.0.4] — 2026-03-05

### Added
- **Embedded region parser** — scans ASPX text to extract JS/CSS/ASP regions with language resolution from `type=` / `language=` attributes
- **Embedded JavaScript language services** inside `<script>` blocks:
  - Go-to-definition
  - Hover documentation
  - Auto-completion
  - Document symbols
- **Embedded JS/CSS diagnostic pipelines** — `embeddedJavaScriptParseError` and `embeddedCssParseError` report parse errors inside `<script>` and `<style>` blocks that contain ASP expressions
- **TextMate grammar** (`webforms-aspx.tmLanguage.json`) — initial ASPX grammar:
  - `scriptBlock` / `styleBlock` — embeds `source.js` / `source.css` inside their respective blocks, with ASP patterns intercepted first
  - Root-level `aspInlineExpression` / `aspBlock` patterns for standalone `<% %>` outside HTML tags
- **`language-configuration.json`** — bracket pairs, comment toggles, and auto-closing pairs for ASPX
- **35 WebForms code snippets** — ASP delimiters, page directives, server controls, layout controls, validation controls
- Debug logging for embedded language processing

### Changed
- `fileWatcher.ts` — now also triggers incremental refresh on `onDidOpenTextDocument` and `onDidChangeTextDocument` (previously only file system events)

---

## [0.0.3] — 2026-03-03

### Added
- `fileWatcher.ts` — subscribes to document open and change events so diagnostics refresh without requiring a file save
- Activation events: `onLanguage:csharp` and `onLanguage:webforms-aspx`

---

## [0.0.2] — 2026-03-03

### Added
- **Compatibility diagnostics** — flags C# syntax unsupported by the configured Visual Studio version:
  - String interpolation `$"..."` (requires C# 6 / VS 2015)
  - `nameof(...)` expression (requires C# 6 / VS 2015)
  - Null-conditional `?.` operator (requires C# 6 / VS 2015)
- **Compatibility profile setting** — `webformsHelper.compatibility.profile` (`vs2005`–`vs2015` or `custom`) determines which C# features are allowed
- **Structural diagnostics** subsystem — `missingCodeFile`, `missingDesigner`, `missingInherits` rules reorganised into `src/diagnostics/structural/`
- Test suite for compatibility rules (82 assertions)

### Removed
- CS0103 false-positive suppression rule — replaced by the new structured compatibility system
- `webformsHelper.rules.cs0103LikelyWebFormsFalsePositive` setting

---

## [0.0.1] — 2026-03-02

### Added
- Extension scaffold for `webforms-aspx` language (scope `text.html.webforms`)
- **File relationship graph** — links `.aspx` ↔ `.aspx.cs` ↔ `.aspx.designer.cs` across the workspace
- **Navigation commands**: Go to Code-Behind, Go to Markup, Go to Designer
- **CodeLens** on markup and code-behind files showing related file links
- **Related files tree view** in the Explorer sidebar
- **ASPX directive parser** — reads `<%@ Page ... %>` attributes (language, inherits, code-behind path)
- **Workspace scanner** — glob-based file discovery with configurable include/exclude patterns and incremental refresh on file system events
- Initial diagnostic kinds: `MissingCodeFile`, `MissingDesigner`, `MissingInherits`
- Settings: `enableCodeLens`, `enableDiagnostics`, `includeGlobs`, `excludeGlobs`, `rules.*`
