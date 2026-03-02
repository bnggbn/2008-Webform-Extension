import { WebFormsSettings } from '../../config/settings';
import { Cs0103FalsePositiveRule } from './cs0103FalsePositiveRule';
import { MissingCodeFileRule } from './missingCodeFileRule';
import { MissingDesignerRule } from './missingDesignerRule';
import { MissingInheritsRule } from './missingInheritsRule';
import { WebFormsRule } from './rule';

export function createDefaultRules(settings: WebFormsSettings): WebFormsRule[] {
  return [
    new MissingCodeFileRule(settings),
    new MissingDesignerRule(settings),
    new MissingInheritsRule(settings),
    new Cs0103FalsePositiveRule(settings),
  ];
}
