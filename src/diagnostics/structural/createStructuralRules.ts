import { WebFormsSettings } from '../../config/settings';
import { MissingCodeFileRule } from './rules/missingCodeFileRule';
import { MissingDesignerRule } from './rules/missingDesignerRule';
import { MissingInheritsRule } from './rules/missingInheritsRule';
import { StructuralRule } from './rules/rule';

export function createStructuralRules(settings: WebFormsSettings): StructuralRule[] {
  return [
    new MissingCodeFileRule(settings),
    new MissingDesignerRule(settings),
    new MissingInheritsRule(settings),
  ];
}
