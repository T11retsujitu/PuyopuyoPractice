import type { FoundationFormId, FoundationTemplate } from './types';
import { STAIRS } from './stairs';
import { KAGI } from './kagi';
import { GTR } from './gtr';

export const FOUNDATION_TEMPLATES: Record<FoundationFormId, FoundationTemplate> = {
  stairs: STAIRS,
  kagi: KAGI,
  gtr: GTR,
};

export { STAIRS, KAGI, GTR };
export { matchTemplate, matchVariant, fitsCurrentPair } from './matcher';
export type { FoundationFormId, FoundationTemplate, MatchResult, TemplateVariant } from './types';
