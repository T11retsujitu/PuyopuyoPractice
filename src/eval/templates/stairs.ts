import type { FoundationTemplate } from './types';
import { defineVariant, mirrorVariant } from './define';

/**
 * 階段積み(3-1型): 各色を縦3個+隣の列の下段にキーぷよ1個。
 * 発火するとキーぷよが横につながって連鎖が流れる。完成形は5連鎖。
 */
const left = defineVariant(
  'stairs-left',
  '階段積み(左発火)',
  [
    '.bcde.',
    'Tbcde.',
    'abcde.',
    'aabcde',
  ],
);

export const STAIRS: FoundationTemplate = {
  id: 'stairs',
  nameJa: '階段積み',
  descriptionJa:
    '同じ色を縦に3個積み、隣の列の下段に「キーぷよ」を1個置く基本の積み方。発火すると横のつながりで連鎖が右(または左)へ流れていきます。',
  variants: [left, mirrorVariant(left, 'stairs-right', '階段積み(右発火)')],
};
