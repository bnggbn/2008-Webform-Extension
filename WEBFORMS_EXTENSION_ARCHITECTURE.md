# WebForms Extension Architecture

## Purpose

This document defines the architecture for a future VS Code extension focused on legacy ASP.NET WebForms / WebSite projects.

The extension is not intended to replace `C# (Microsoft)` on day one.
Its first job is to add WebForms-aware navigation, mapping, and lightweight diagnostics on top of existing C# support.

## Current Implementation Status

This document started as a forward-looking architecture draft.
The codebase now implements most MVP layers and part of the embedded-language replacement roadmap.

Implemented in code:

- workspace scan + relationship resolution + related-files tree
- navigation commands and CodeLens
- structural diagnostics
- compatibility diagnostics
- embedded JS/CSS projection + diagnostics pipelines (with shared abstract base class)
- embedded JavaScript symbols / same-file definition / hover
- custom `webforms-aspx` language grammar and snippets
- server control ID parsing (`runat="server"` elements) and designer field name enrichment
- debug logging infrastructure for embedded language diagnostics (`debug.embeddedLanguageLogs`)
- editor-event-driven incremental diagnostics (live refresh on document open/change)

Partially implemented / intentionally limited:

- embedded JavaScript completion exists in code but is intentionally not registered (import not present in `extension.ts`) to avoid noisy auto-popup behavior
- built-in JS/CSS diagnostics are not suppressed; this extension publishes its own diagnostics in parallel
- CSS validation uses a custom hand-written parser (not an external library)

## Product Positioning

This extension is for developers maintaining legacy:

- ASP.NET WebForms
- ASP.NET WebSite projects
- Visual Studio 2005 / 2008 / 2010 era solutions

Primary value:

- connect `.aspx` / `.ascx` / `.master` / `.ashx` / `.asmx` files to their code-behind and designer files
- add rule-based WebForms diagnostics without implementing a full compiler
- flag legacy C# syntax compatibility issues that modern Roslyn setups may not surface for old environments

## Goals

- Navigation-first support for WebForms files
- Lightweight diagnostics for common WebForms structural issues
- Legacy compatibility diagnostics for older Visual Studio / C# language targets
- JSON-configurable rules so real-world legacy cases can be added incrementally
- Safe coexistence with `C# (Microsoft)`

## Non-Goals

- Replacing Roslyn or OmniSharp immediately
- Real build support
- Full ASP.NET runtime emulation
- Full Visual Studio 2008 parity
- Complete control tree / page lifecycle semantic analysis in v1

## Compatibility Strategy

The extension should coexist with `C# (Microsoft)` by default.

Rules:

- Do not register a competing C# completion provider for normal `.cs` files in v1
- Do not attempt to remove diagnostics emitted by other extensions
- Do add WebForms-specific diagnostics under this extension's own diagnostic source
- Do add commands, CodeLens, views, and quick fixes around WebForms structure

Long term, the extension may reduce dependence on `C# (Microsoft)`, but that is not required for the MVP.

## Core User Problems

1. `.aspx` and `.aspx.cs` are not linked in VS Code.
2. `.designer.cs` fields are not understood in WebForms-aware ways.
3. Some newer C# syntax can compile or parse in the editor even though it is invalid for the target legacy environment.
   - `$"..."` string interpolation in VS2008 / C# 3.0 projects
   - `nameof(...)` in pre-C# 6 projects
   - `?.` / `?[]` null-conditional access in pre-C# 6 projects
4. Legacy Website projects lack clear project structure in editor workflows.

## MVP Scope

### Navigation

- `Go to Code Behind`
- `Go to Markup`
- `Go to Designer`
- `Reveal Related WebForms Files`

### CodeLens

On `.aspx`, `.ascx`, `.master`:

- Open code-behind
- Open designer

On `.aspx.cs`, `.ascx.cs`, `.master.cs`:

- Open markup
- Open designer

### Diagnostics

Rule-based only.

Initial rules:

- missing `CodeFile` target
- missing `Inherits`
- missing `.designer.cs`
- unsupported string interpolation for legacy profiles
- unsupported `nameof(...)` for legacy profiles
- unsupported null-conditional access for legacy profiles

### Views

- `WebForms Relationships` tree view

## Architectural Overview

The extension should be split into six modules.

### 1. Workspace Scanner

Responsibilities:

- scan workspace folders
- discover candidate WebForms files
- ignore `bin`, `obj`, `node_modules`, generated output directories
- maintain a normalized index of related files

Inputs:

- workspace folders
- include/exclude globs from settings

Outputs:

- raw file inventory

### 2. Directive Parser

Responsibilities:

- parse top-level ASP.NET directives from markup files
- extract:
  - `CodeFile`
  - `CodeBehind`
  - `Inherits`
  - optional `ClassName`
  - control/page kind

Supported file types:

- `.aspx`
- `.ascx`
- `.master`
- `.ashx`
- `.asmx`

Implementation note:

- keep parser tolerant and line-based
- avoid trying to parse full ASPX syntax in v1

### 3. Relationship Resolver

Responsibilities:

- connect markup, code-behind, designer, and inherits information
- resolve paths relative to the markup file
- infer fallback relationships by naming convention when directives are incomplete

Output entity:

```ts
type WebFormEntry = {
  kind: "page" | "control" | "master" | "handler" | "service";
  markupPath: string;
  codeBehindPath?: string;
  designerPath?: string;
  inherits?: string;
  codeFile?: string;
  codeBehindDirective?: string;
  serverControlIds: string[];
  designerFieldNames: string[];
};
```

Additional enrichment:

- `serverControlIds` are extracted by `directiveParser.parseServerControlIds()` from `runat="server"` elements in markup
- `designerFieldNames` are extracted by `WorkspaceScanner.enrichEntry()` via regex from `.designer.cs` files

### 4. Navigation Layer

Responsibilities:

- commands
- CodeLens
- editor actions
- tree view navigation

This layer should only consume `WebFormEntry` data and should not perform raw parsing itself.

### 5. Diagnostics Engine

Responsibilities:

- run rule-based checks against resolved entries
- run compatibility checks against C# source files
- publish diagnostics under its own diagnostic collection

Important constraint:

- it should not assume it can delete diagnostics emitted by other extensions

Instead it should produce:

- its own diagnostics
- structural diagnostics for WebForms relationships
- compatibility diagnostics for legacy language targets

### 6. Configuration / Rules Engine

Responsibilities:

- load JSON-backed settings from VS Code configuration
- map rule names to severities
- allow project-specific tuning without code changes

### 7. Embedded Projection Layer

Responsibilities:

- extract client-side `<script>` and `<style>` regions from `.aspx` / `.ascx` / `.master`
- mask ASP.NET server tags in memory without modifying the source file
- preserve stable offsets so projected diagnostics can be mapped back to the original document
- provide projected text to downstream consumers: JS/CSS validation, symbol extraction, definition lookup, hover

Implementation notes:

- server expression tags are replaced with `null ` (JS) or `inherit` (CSS) to maintain offset stability
- embedded diagnostic pipelines share an abstract base class (`embeddedLanguageDiagnosticsPipelineBase.ts`) that handles document refresh lifecycle
- CSS validation uses a custom hand-written parser (no external CSS parser dependency)
- JavaScript validation and symbol extraction use `ts.transpileModule` / `ts.createSourceFile` from TypeScript

## Package Structure (Current)

```text
src/
  extension.ts
  logging/
    outputChannel.ts
  scanner/
    workspaceScanner.ts
    fileWatcher.ts
  parser/
    directiveParser.ts
    embedded/
      embeddedRegionParser.ts
      embeddedLanguageResolver.ts
      htmlOpenTagParser.ts
      types.ts
  resolver/
    relationshipResolver.ts
    namingConventionResolver.ts
  navigation/
    commands.ts
    codeLensProvider.ts
    relatedFilesTree.ts
    embeddedJavaScriptDocumentSymbolProvider.ts
    embeddedJavaScriptDefinitionProvider.ts
    embeddedJavaScriptHoverProvider.ts
    embeddedJavaScriptCompletionProvider.ts
  diagnostics/
    diagnosticEngine.ts
    embedded/
      embeddedLanguageDiagnosticsPipelineBase.ts
      aspxJavaScriptDiagnosticsPipeline.ts
      aspxCssDiagnosticsPipeline.ts
      embeddedDebugLog.ts
    structural/
      structuralDiagnosticsPipeline.ts
      createStructuralRules.ts
      rules/
        missingCodeFileRule.ts
        missingDesignerRule.ts
        missingInheritsRule.ts
        rule.ts
    compatibility/
      compatibilityDiagnosticsPipeline.ts
      createCompatibilityRules.ts
      compatibilityCore.ts
      compatibilityRuleUtils.ts
      compatibilitySyntaxFinders.ts
      rules/
        stringInterpolationCompatibilityRule.ts
        nameofCompatibilityRule.ts
        nullConditionalCompatibilityRule.ts
        rule.ts
  projection/
    aspxEmbeddedProjection.ts
    aspxJavaScriptValidation.ts
    aspxCssValidation.ts
    aspxJavaScriptSymbols.ts
    aspxJavaScriptDefinitions.ts
    aspxJavaScriptHover.ts
    aspxJavaScriptCompletion.ts
    aspxJavaScriptUtils.ts
  config/
    settings.ts
    ruleConfig.ts
  models/
    webFormEntry.ts
    diagnosticKinds.ts
  utils/
    fileUtils.ts
    pathUtils.ts
    globUtils.ts
    textUtils.ts
syntaxes/
  webforms-aspx.tmLanguage.json
snippets/
  webforms-aspx.code-snippets
language-configuration.json
```

Grammar note:

- Embedded ASP handling is centralized in the main `webforms-aspx` grammar (no separate injection grammar registration).
- In quoted JS/CSS/HTML segments that contain `<%...%>`, ASP rules are evaluated first and string scopes are applied only to non-ASP text segments to reduce scope bleed.

## JSON Configuration Model

Use normal VS Code settings first.

Example:

```json
{
  "webformsHelper.enableCodeLens": true,
  "webformsHelper.enableDiagnostics": true,
  "webformsHelper.includeGlobs": [
    "**/*.{aspx,ascx,master,ashx,asmx}",
    "**/*.designer.cs",
    "**/*.cs"
  ],
  "webformsHelper.excludeGlobs": [
    "**/bin/**",
    "**/obj/**",
    "**/node_modules/**",
    "**/tools/_intellisense/**"
  ],
  "webformsHelper.compatibility.profile": "vs2008",
  "webformsHelper.compatibility.csharpLanguageVersion": "",
  "webformsHelper.rules": {
    "missingCodeFile": "warning",
    "missingDesigner": "information",
    "missingInherits": "warning",
    "unsupportedStringInterpolation": "error",
    "unsupportedNameofExpression": "error",
    "unsupportedNullConditionalAccess": "error",
    "embeddedJavaScriptParseError": "warning",
    "embeddedCssParseError": "warning"
  }
}
```

Future optional file-based config:

```text
.webforms-helper.json
```

Only add that if settings-based configuration becomes insufficient.

## Diagnostics Model

Diagnostics should be categorized into two groups.

### A. Structural Diagnostics

These are produced entirely by this extension.

Examples:

- markup file references missing code-behind
- designer file missing
- invalid `Inherits` mapping

### B. Compatibility Diagnostics

These are extension-owned diagnostics for syntax that is valid in newer C# versions but not in the configured legacy target.

Examples:

- `$"..."` string interpolation when the profile is `vs2008`
- `nameof(...)` when the configured language version is below C# 6
- `?.` / `?[]` when the configured language version is below C# 6

Suggested representation:

- publish under this extension's own diagnostic source
- severity controlled by settings
- evaluate independently from Roslyn's own compiler diagnostics

## Initial Rule Design

### `missingCodeFile`

Triggers when:

- markup contains `CodeFile` or `CodeBehind`
- resolved target file does not exist

### `missingDesigner`

Triggers when:

- a page/control expects a designer file by convention
- no `.designer.cs` exists

### `missingInherits`

Triggers when:

- markup directive lacks `Inherits`

### `unsupportedStringInterpolation`

Triggers when:

- configured compatibility profile does not support C# 6
- source file contains `$"..."` string interpolation

### `unsupportedNameofExpression`

Triggers when:

- configured compatibility profile does not support C# 6
- source file contains `nameof(...)`

### `unsupportedNullConditionalAccess`

Triggers when:

- configured compatibility profile does not support C# 6
- source file contains `?.` or `?[]`

## Interaction with `C# (Microsoft)`

Safe coexistence rules:

- do not override normal C# completion
- do not register conflicting language IDs
- do not depend on internal APIs of the C# extension
- treat external diagnostics as read-only context when available through editor UX, not as mutable state

If future integration is needed, build an adapter layer rather than hardcoding assumptions everywhere.

## Performance Notes

- use file watching plus incremental refresh
- avoid rescanning the full workspace on every change
- parse only the directive/header area of markup files in v1
- cache `WebFormEntry` records by file path and invalidate on related file changes
- scanner skips generated files: `.g.cs`, `.g.i.cs`, `AssemblyInfo.cs`, `.designer.cs.cs`, and paths containing `\obj\` or `\bin\`
- `FileWatcher` subscribes to `onDidOpenTextDocument` and `onDidChangeTextDocument` for editor-event-driven incremental diagnostics, and retroactively processes already-open documents at construction time

## Testing Strategy

### Unit Tests

- directive parsing
- relationship resolution
- path resolution
- rule evaluation
- compatibility syntax detection

### Fixture Tests

Use real legacy samples:

- `.aspx` + `.aspx.cs` + `.designer.cs`
- missing designer
- incorrect `Inherits`
- Chinese paths
- nested WebSite structures

### Integration Tests

- open workspace fixtures
- verify navigation command targets
- verify diagnostics output

## Recommended MVP Milestones

### Milestone 1

- workspace scan
- directive parsing
- relationship model
- navigation commands

### Milestone 2

- CodeLens
- related-files tree view
- structural diagnostics

### Milestone 3

- compatibility diagnostics
- JSON-configurable rule severities

### Milestone 4

- incremental caching
- more heuristic rules from real user cases
- more legacy syntax compatibility rules

## Suggested README Positioning for the Extension Repo

Short version:

> VS Code helper for legacy ASP.NET WebForms / WebSite projects.
> Adds markup-to-code-behind navigation, designer awareness, and lightweight structural / compatibility diagnostics without replacing the standard C# extension.

## Final Guidance

The extension should begin as a guidance tool, not a compiler replacement.

That keeps scope controlled while still solving the most painful real-world gaps:

- missing navigation
- missing relationship awareness
- missing legacy compatibility checks
- weak support for legacy WebForms structures

If this foundation proves useful, diagnostics and deeper IntelliSense-like behaviors can be added gradually through rules and heuristics driven by real projects.
