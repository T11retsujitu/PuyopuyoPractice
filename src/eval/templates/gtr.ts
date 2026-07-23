import type { FoundationTemplate } from './types';
import { defineVariant, mirrorVariant } from './define';

/**
 * GTR(左折り返し): 1〜3列目のL字折り返しが骨格(required)。
 * 2階のぷよ(2列4段)・接続点(3列3段)・右への土台先端(4列目)は
 * 標準的な継続形として suggested 扱い。
 */
const left = defineVariant(
  'gtr-left',
  'GTR(左折り返し)',
  [
    'TB....',
    'aaC...',
    'babC..',
    'bbcC..',
  ],
  [4, 5],
);

export const GTR: FoundationTemplate = {
  id: 'gtr',
  nameJa: 'GTR',
  descriptionJa:
    '1〜3列目にL字の「折り返し」を作る定番の土台。2階へ連鎖を折り返せるため、大連鎖に伸ばしやすい形です。骨格の8個が最優先、その後2階と右への土台をつなげます。',
  variants: [left, mirrorVariant(left, 'gtr-right', 'GTR(右折り返し)')],
};
