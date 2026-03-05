import * as ts from 'typescript';

export type ExternalJavaScriptDefinition = {
  name: string;
  start: number;
  end: number;
};

export type ExternalJavaScriptReference = {
  name: string;
  start: number;
  end: number;
  isDeclaration: boolean;
};

export function findExternalJavaScriptDefinitionByName(text: string, name: string): ExternalJavaScriptDefinition | undefined {
  if (!name) {
    return undefined;
  }

  const definitions = collectDefinitions(text).filter(definition => definition.name === name);
  if (definitions.length === 0) {
    return undefined;
  }

  const [first] = definitions.sort((left, right) => left.start - right.start);
  return first;
}

export function collectExternalJavaScriptReferencesByName(text: string, name: string): ExternalJavaScriptReference[] {
  if (!name) {
    return [];
  }

  const sourceFile = ts.createSourceFile('external.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const references: ExternalJavaScriptReference[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === name && shouldTrackIdentifier(node)) {
      references.push({
        name,
        start: node.getStart(sourceFile),
        end: node.end,
        isDeclaration: isDeclarationIdentifier(node),
      });
    }
    node.forEachChild(visit);
  };

  sourceFile.forEachChild(visit);
  return dedupeReferences(references);
}

function collectDefinitions(text: string): ExternalJavaScriptDefinition[] {
  const sourceFile = ts.createSourceFile('external.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const definitions: ExternalJavaScriptDefinition[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      definitions.push({ name: node.name.text, start: node.name.getStart(sourceFile), end: node.name.end });
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      definitions.push({ name: node.name.text, start: node.name.getStart(sourceFile), end: node.name.end });
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      definitions.push({ name: node.name.text, start: node.name.getStart(sourceFile), end: node.name.end });
    }

    node.forEachChild(visit);
  };

  sourceFile.forEachChild(visit);
  return definitions;
}

function shouldTrackIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) {
    return true;
  }

  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return false;
  }
  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return false;
  }
  if (ts.isPropertyDeclaration(parent) && parent.name === node) {
    return false;
  }
  if (ts.isMethodDeclaration(parent) && parent.name === node) {
    return false;
  }

  return true;
}

function isDeclarationIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) {
    return false;
  }

  if (ts.isFunctionDeclaration(parent) && parent.name === node) {
    return true;
  }
  if (ts.isVariableDeclaration(parent) && parent.name === node) {
    return true;
  }
  if (ts.isParameter(parent) && parent.name === node) {
    return true;
  }

  return false;
}

function dedupeReferences(references: ExternalJavaScriptReference[]): ExternalJavaScriptReference[] {
  const seen = new Set<string>();
  const output: ExternalJavaScriptReference[] = [];
  for (const reference of references) {
    const key = `${reference.start}:${reference.end}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(reference);
  }
  return output;
}
