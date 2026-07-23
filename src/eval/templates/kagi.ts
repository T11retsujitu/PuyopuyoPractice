import type { FoundationTemplate } from './types';
import { defineVariant, mirrorVariant } from './define';

/**
 * カギ積み(挟み込み): 「下2個+1個挟んで+同色1個」のカギ形。
 * 消えた列の上から落ちてくるぷよが縦につながって連鎖する。完成形は5連鎖。
 */
const left211 = defineVariant(
  'kagi-211-left',
  'カギ積み 2-1-1型(左発火)',
  [
    '.bcde.',
    'Tabcd.',
    'abcde.',
    'abcdee',
  ],
);

const left112 = defineVariant(
  'kagi-112-left',
  'カギ積み 1-1-2型(左発火)',
  [
    '.bcde.',
    'Tbcde.',
    'aabcd.',
    'abcdee',
  ],
);

export const KAGI: FoundationTemplate = {
  id: 'kagi',
  nameJa: 'カギ積み',
  descriptionJa:
    '同色2個の上に別の色を1個挟み、その上にまた同色を置く「カギ」の形。階段積みより形の自由度が高く、連鎖が縦のつながりで流れます。',
  variants: [
    left211,
    left112,
    mirrorVariant(left211, 'kagi-211-right', 'カギ積み 2-1-1型(右発火)'),
    mirrorVariant(left112, 'kagi-112-right', 'カギ積み 1-1-2型(右発火)'),
  ],
};
