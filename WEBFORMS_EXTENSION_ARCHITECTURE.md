# WebForms Extension Architecture

## Purpose

This document defines the architecture for a future VS Code extension focused on legacy ASP.NET WebForms / WebSite projects.

The extension is not intended to replace `C# (Microsoft)` on day one.
Its first job is to add WebForms-aware navigation, mapping, and lightweight diagnostics on top of existing C# support.

## Product Positioning

This extension is for developers maintaining legacy:

- ASP.NET WebForms
- ASP.NET WebSite projects
- Visual Studio 2005 / 2008 / 2010 era solutions

Primary value:

- connect `.aspx` / `.ascx` / `.master` / `.ashx` / `.asmx` files to their code-behind and designer files
- provide guidance where generic C# tooling produces false positives
- add rule-based WebForms diagnostics without implementing a full compiler

## Goals

- Navigation-first support for WebForms files
- Lightweight diagnostics for common WebForms structural issues
- WebForms-aware suppression guidance for likely false positives from generic C# tooling
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
3. Generic C# diagnostics can report false positives such as:
   - `CS0103`: control field not found
   - `CS0101`: duplicate type due to WebSite model quirks
   - `CS0246`: unresolved type caused by legacy website structure or missing generated context
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
- `Inherits` mismatch between markup and designer/code-behind
- likely false-positive `CS0103` when a server control ID or designer field exists

### Views

- `WebForms Relationships` tree view
- `WebForms Problems` tree view

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
};
```

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
- publish diagnostics under its own diagnostic collection
- classify likely false positives from generic C# tooling

Important constraint:

- it should not assume it can delete diagnostics emitted by other extensions

Instead it should produce:

- its own diagnostics
- explanatory messages
- optional suppression guidance in a dedicated view

### 6. Configuration / Rules Engine

Responsibilities:

- load JSON-backed settings from VS Code configuration
- map rule names to severities
- allow project-specific tuning without code changes

## Suggested Package Structure

```text
src/
  extension.ts
  scanner/
    workspaceScanner.ts
    fileWatcher.ts
  parser/
    directiveParser.ts
  resolver/
    relationshipResolver.ts
    namingConventionResolver.ts
  navigation/
    commands.ts
    codeLensProvider.ts
    relatedFilesTree.ts
  diagnostics/
    diagnosticEngine.ts
    rules/
      missingCodeFileRule.ts
      missingDesignerRule.ts
      missingInheritsRule.ts
      cs0103FalsePositiveRule.ts
  config/
    settings.ts
    ruleConfig.ts
  models/
    webFormEntry.ts
    diagnosticKinds.ts
  utils/
    pathUtils.ts
    globUtils.ts
    textUtils.ts
```

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
  "webformsHelper.codeBehindFields": [
    "CodeFile",
    "CodeBehind"
  ],
  "webformsHelper.rules": {
    "missingCodeFile": "warning",
    "missingDesigner": "information",
    "missingInherits": "warning",
    "inheritsMismatch": "warning",
    "cs0103LikelyWebFormsFalsePositive": "information"
  },
  "webformsHelper.pathAliases": {},
  "webformsHelper.knownPatterns": []
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

### B. False-Positive Guidance

These are not true compiler diagnostics.
They are explanations layered on top of known generic-C# limitations.

Examples:

- `CS0103` on a WebForms control field that exists in markup/designer
- duplicate partial type errors caused by Website compilation model

Suggested representation:

- publish as `Information` diagnostics
- also show in `WebForms Problems`
- add quick action text like:
  - `Likely WebForms false positive`
  - `Check designer mapping`

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

### `inheritsMismatch`

Triggers when:

- `Inherits` does not align with code-behind/designer class naming patterns

### `cs0103LikelyWebFormsFalsePositive`

Triggers when:

- current file is `*.aspx.cs`, `*.ascx.cs`, or similar
- a matching markup/designer relationship exists
- a referenced identifier appears to be a server control ID or designer field candidate

In v1, this can be heuristic only.

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

## Testing Strategy

### Unit Tests

- directive parsing
- relationship resolution
- path resolution
- rule evaluation

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

- false-positive guidance rules
- JSON-configurable rule severities
- `WebForms Problems` panel

### Milestone 4

- incremental caching
- more heuristic rules from real user cases
- optional suppression guidance UX

## Suggested README Positioning for the Extension Repo

Short version:

> VS Code helper for legacy ASP.NET WebForms / WebSite projects.
> Adds markup-to-code-behind navigation, designer awareness, and lightweight diagnostics without replacing the standard C# extension.

## Final Guidance

The extension should begin as a guidance tool, not a compiler replacement.

That keeps scope controlled while still solving the most painful real-world gaps:

- missing navigation
- missing relationship awareness
- noisy false positives
- weak support for legacy WebForms structures

If this foundation proves useful, diagnostics and deeper IntelliSense-like behaviors can be added gradually through rules and heuristics driven by real projects.
