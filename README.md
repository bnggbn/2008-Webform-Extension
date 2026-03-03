# WebForms Helper for VS2008

VS Code extension prototype for legacy ASP.NET WebForms / WebSite projects.

Current features:

- WebForms related-file navigation
- structural diagnostics for common WebForms file relationship issues
- legacy C# compatibility diagnostics for syntax that Roslyn may not flag when targeting older environments

Current commands:

- `WebForms: Go to Code Behind`
- `WebForms: Go to Markup`
- `WebForms: Go to Designer`
- `WebForms: Refresh Relationships`

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
  "webformsHelper.rules.unsupportedNullConditionalAccess": "error"
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

## Development

```bash
npm install
npm run build
```

Then press `F5` in VS Code to launch the Extension Development Host.
