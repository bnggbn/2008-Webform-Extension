export type ParsedOpenTag = {
  start: number;
  end: number;
  raw: string;
  name: string;
};

export type ParsedAttribute = {
  name: string;
  value: string;
  valueStart: number;
};

export function readAttribute(tagText: string, attributeName: string): string | undefined {
  const pattern = new RegExp(`\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tagText.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

export function readOpenTag(text: string, searchFrom: number): ParsedOpenTag | undefined {
  const start = text.indexOf('<', searchFrom);
  if (start < 0 || start + 1 >= text.length) {
    return undefined;
  }

  const next = text[start + 1];
  if (next === '%' || next === '!' || next === '?') {
    return undefined;
  }

  let index = start + 1;
  while (index < text.length && /\s/.test(text[index])) {
    index++;
  }

  const nameStart = index;
  while (index < text.length && /[A-Za-z0-9:_-]/.test(text[index])) {
    index++;
  }
  if (index === nameStart) {
    return undefined;
  }

  const name = text.slice(nameStart, index);
  let quote: '"' | '\'' | undefined;
  let inServerTag = false;
  while (index < text.length) {
    if (!quote && !inServerTag && text[index] === '<' && text[index + 1] === '%') {
      inServerTag = true;
      index += 2;
      continue;
    }

    if (inServerTag) {
      if (text[index] === '%' && text[index + 1] === '>') {
        inServerTag = false;
        index += 2;
        continue;
      }
      index++;
      continue;
    }

    if (!quote && (text[index] === '"' || text[index] === '\'')) {
      quote = text[index] as '"' | '\'';
      index++;
      continue;
    }

    if (quote && text[index] === quote) {
      quote = undefined;
      index++;
      continue;
    }

    if (!quote && text[index] === '>') {
      return {
        start,
        end: index + 1,
        raw: text.slice(start, index + 1),
        name,
      };
    }

    index++;
  }

  return undefined;
}

export function readAttributes(tagText: string): ParsedAttribute[] {
  const attributes: ParsedAttribute[] = [];
  let index = 1;

  while (index < tagText.length && !/\s/.test(tagText[index]) && tagText[index] !== '>') {
    index++;
  }

  while (index < tagText.length) {
    while (index < tagText.length && /\s/.test(tagText[index])) {
      index++;
    }
    if (index >= tagText.length || tagText[index] === '>' || (tagText[index] === '/' && tagText[index + 1] === '>')) {
      break;
    }

    const nameStart = index;
    while (index < tagText.length && /[^\s=>/]/.test(tagText[index])) {
      index++;
    }
    const name = tagText.slice(nameStart, index);
    while (index < tagText.length && /\s/.test(tagText[index])) {
      index++;
    }
    if (tagText[index] !== '=') {
      continue;
    }

    index++;
    while (index < tagText.length && /\s/.test(tagText[index])) {
      index++;
    }
    if (index >= tagText.length) {
      break;
    }

    const valueStart = index;
    if (tagText[index] === '"' || tagText[index] === '\'') {
      const quote = tagText[index];
      const contentStart = index + 1;
      index++;
      let inServerTag = false;
      while (index < tagText.length) {
        if (!inServerTag && tagText[index] === '<' && tagText[index + 1] === '%') {
          inServerTag = true;
          index += 2;
          continue;
        }
        if (inServerTag) {
          if (tagText[index] === '%' && tagText[index + 1] === '>') {
            inServerTag = false;
            index += 2;
            continue;
          }
          index++;
          continue;
        }
        if (tagText[index] === quote) {
          attributes.push({
            name,
            value: tagText.slice(contentStart, index),
            valueStart: contentStart,
          });
          index++;
          break;
        }
        index++;
      }
      continue;
    }

    while (index < tagText.length && !/\s|>/.test(tagText[index])) {
      index++;
    }
    attributes.push({
      name,
      value: tagText.slice(valueStart, index),
      valueStart,
    });
  }

  return attributes;
}
