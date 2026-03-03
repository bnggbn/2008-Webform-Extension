import { WebFormsSettings } from '../../config/settings';
import { NameofCompatibilityRule } from './rules/nameofCompatibilityRule';
import { NullConditionalCompatibilityRule } from './rules/nullConditionalCompatibilityRule';
import { CompatibilityRule } from './rules/rule';
import { StringInterpolationCompatibilityRule } from './rules/stringInterpolationCompatibilityRule';

export function createCompatibilityRules(settings: WebFormsSettings): CompatibilityRule[] {
  return [
    new StringInterpolationCompatibilityRule(settings),
    new NameofCompatibilityRule(settings),
    new NullConditionalCompatibilityRule(settings),
  ];
}
