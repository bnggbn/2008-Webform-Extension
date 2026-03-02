export type WebFormKind = 'page' | 'control' | 'master' | 'handler' | 'service';

export type WebFormEntry = {
  kind: WebFormKind;
  markupPath: string;
  codeBehindPath?: string;
  designerPath?: string;
  inherits?: string;
  codeFile?: string;
  codeBehindDirective?: string;
  serverControlIds: string[];
  designerFieldNames: string[];
};
