export function toGlobPattern(globs: string[]): string {
  return globs.length === 1 ? globs[0] : `{${globs.join(',')}}`;
}

export const DEFAULT_INCLUDE_GLOBS = [
  '**/*.{aspx,ascx,master,ashx,asmx}',
  '**/*.cs',
];
