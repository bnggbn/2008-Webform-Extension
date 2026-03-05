# Embedded Language Replacement Plan

## Goal

This document tracks the step-by-step replacement of unusable built-in JavaScript/CSS behavior inside legacy WebForms markup files:

- `.aspx`
- `.ascx`
- `.master`

The target is not full Vue/React-level language support.
The target is a usable embedded-language workflow for maintenance work.

## Why This Exists

Built-in VS Code HTML/JavaScript/CSS support does not understand ASP.NET server tags such as:

- `<% ... %>`
- `<%= ... %>`
- `<%# ... %>`
- `<%: ... %>`

That causes large amounts of false diagnostics inside:

- `<script> ... </script>`
- `<style> ... </style>`
- `onclick="..."`
- `style="..."`

Because normal extension APIs cannot directly remove built-in diagnostics, this plan focuses on replacing useful parts incrementally rather than trying to fake full suppression.

## Current Position

### Already Implemented

- WebForms relationship/navigation support
- structural diagnostics
- legacy C# compatibility diagnostics
- custom `webforms-aspx` language ownership for `.aspx`, `.ascx`, and `.master`
- in-memory ASPX embedded-region projection
- separated embedded parser modules for tag scanning, attribute scanning, and language resolution
- offset mapping from projected text back to original markup
- support for:
  - `<script>`
  - `<style>`
  - event attributes such as `onclick`
  - `style=""`
  - legacy `language="JavaScript"` script tags
- first experimental ASPX-aware JavaScript parse diagnostics pipeline

### Current Limitation

- built-in `javascript` / `css` diagnostics still remain visible
- custom embedded diagnostics do not automatically replace built-in language service behavior
- no embedded IntelliSense / completion / definition yet

## Replacement Strategy

We replace capabilities in layers, not all at once.

Order of replacement:

1. Projection and mapping
2. Embedded diagnostics
3. Local symbol understanding
4. Minimal navigation
5. Optional hover/completion

This keeps the project usable and prevents context sprawl.

## Phases

### Phase 0: Foundation

Status: `done`

Scope:

- detect embedded JS/CSS regions
- mask server tags in memory
- preserve stable offsets
- add unit tests for projection behavior

Done when:

- projected text keeps line/offset stability
- common WebForms server tag forms are masked safely
- tests cover script/style and attribute cases

### Phase 1: Usable JavaScript Diagnostics

Status: `done`

Scope:

- run JavaScript parse validation on projected embedded JS
- support:
  - `<script>`
  - event attributes like `onclick`
- report diagnostics through `webformsHelper`
- avoid false positives caused only by server tags

Done when:

- projected JS does not false-fail on `<% %>` blocks
- real JS syntax errors inside projected regions still report
- results map back to original `.aspx` positions correctly

Verified so far:

- projected script regions are detected on real `.aspx` samples
- embedded JavaScript refresh runs on live markup edits
- mixed `<script>` + `<% %>` samples can produce `regions > 0` with `diagnostics = 0`, which confirms server-tag false positives are not reintroduced by the custom pipeline

Remaining close-out check:

- confirmed: real syntax errors inside projected script regions produce `aspxEmbeddedJavaScriptParseError` in the editor

Not included:

- replacing built-in `javascript` diagnostics
- JS completion
- JS `F12`

### Phase 2: Usable CSS Diagnostics

Status: `done`

Scope:

- project embedded CSS safely
- validate:
  - `<style>`
  - `style=""`
- avoid false CSS parse errors caused by `<%= ... %>`

Done when:

- embedded CSS false positives drop on real WebForms samples
- real CSS syntax mistakes still map back correctly

Verified so far:

- projected CSS regions are detected on real `.aspx` samples
- false positives caused by server-tag-heavy `style=""` attributes have been filtered
- real CSS syntax mistakes in projected regions are covered by unit tests

### Phase 3: Local JavaScript Symbols

Status: `done`

Scope:

- build a local symbol index from projected embedded JS
- expose document symbols for functions/variables in markup-contained JS

Done when:

- outline/document symbol view can show basic JS functions from `.aspx`
- symbol ranges map back to original document

Verified so far:

- projected embedded JavaScript symbols appear in the editor outline / document symbol flow
- function and variable symbols are extracted from real WebForms script blocks
- nested symbols are preserved in the projected symbol tree

### Phase 4: Minimal JavaScript Navigation

Status: `done`

Scope:

- support basic `F12` inside the same markup file for embedded JS symbols
- only local projected-script definition lookup

Done when:

- `F12` on a function call inside embedded JS can jump to the function declaration in the same file

Verified so far:

- same-file `F12` for embedded JavaScript function declarations is working in the editor
- output logging confirms the custom embedded JavaScript definition provider is handling the request

Not included:

- cross-file JS references
- rename
- advanced symbol resolution

### Phase 5: Optional Embedded Language Features

Status: `in_progress`

Possible scope:

- hover
- limited completion
- smarter symbol resolution

This phase only starts if earlier phases already provide clear maintenance value.

Current note:

- hover is enabled and registered for `webforms-aspx` markup files
- local completion exists in code (`embeddedJavaScriptCompletionProvider.ts` + `aspxJavaScriptCompletion.ts`) but is intentionally not registered - the import is not present in `extension.ts` because auto-popup behavior is too noisy for maintenance use
- references are enabled and registered for `webforms-aspx` markup files
- cross-file JS navigation/references currently resolve from markup into externally referenced `<script src="...">` files
- embedded diagnostic pipelines share a composition-based runner (`embeddedDiagnosticsRunner.ts`) for document refresh lifecycle
- CSS validation uses a custom hand-written parser (no external CSS parser dependency)

## Explicit Non-Goals For Now

- removing built-in JS/CSS diagnostics through unsupported APIs
- full VS2008 WebForms designer parity
- full React/Vue-style language service completeness
- cross-file JavaScript intelligence beyond externally referenced `<script src="...">` files
- embedded refactor/rename

## Decision Rules

Use these rules before adding new work:

1. If a change does not improve maintenance usability, defer it.
2. If a change only duplicates built-in diagnostics noise, stop.
3. Prefer local same-file support before any global language feature.
4. Preserve offset stability before adding richer features.
5. Update this file after every completed phase or scope change.

## Next Concrete Tasks

1. Decide whether experimental embedded diagnostics stay enabled by default or behind a setting.
2. Decide whether to start Phase 5 or stop after the current maintenance-focused milestone.
3. Add a small editor-facing verification checklist for embedded JS/CSS diagnostics and embedded JS navigation.

## Update Log

### 2026-03-04

- Created the replacement roadmap document.
- Marked projection foundation as done.
- Marked usable JavaScript diagnostics as done.
- Promoted embedded JavaScript parse diagnostics to a configurable rule.
- Verified live `.aspx` refresh and region extraction through output logging.
- Verified real syntax errors in projected script regions produce custom embedded diagnostics.
- Marked usable CSS diagnostics as done.
- Marked local JavaScript symbols as done.
- Marked minimal same-file JavaScript navigation as done.
- Started `webforms-aspx` language takeover for markup files.

### 2026-03-05

- Updated architecture doc to match actual codebase: fixed package structure tree, added missing pipeline files, updated `WebFormEntry` type, added embedded rule settings to config example.
- Clarified Phase 5 status: hover registered, completion code exists but import not present in `extension.ts`.
- Documented that CSS validation is a custom hand-written parser, not based on an external library.
- Replaced embedded diagnostic base class with a composition-based runner shared by JS/CSS/ASP-tag pipelines.
- Enabled embedded JavaScript references (`Shift+F12`) for same-file projected symbols.
- Added cross-file embedded JS navigation/references from markup files into externally referenced script files.
- Moved JS/CSS embedded language logic to `services/embedded/*` and reduced `projection/` to projection-focused files.
