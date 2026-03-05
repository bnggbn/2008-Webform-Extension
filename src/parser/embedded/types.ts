export type EmbeddedLanguage = 'javascript' | 'css';

export type EmbeddedRegion = {
  language: EmbeddedLanguage;
  documentStart: number;
  documentEnd: number;
  originalText: string;
  hasServerTags: boolean;
  source: 'tag-body' | 'attribute';
  containerTag: string;
  attributeName?: string;
};
