import type { Color, Pair } from './types';
import { DEFAULT_COLORS } from './types';
import { SeededRng } from './rng';

/**
 * ツモの供給源。128手でループする。
 * リプレイ読み込みや「クソツモ」練習用デッキはこのインターフェースの別実装として追加できる。
 */
export interface TsumoSource {
  readonly seed: number;
  pairAt(index: number): Pair;
}

export const DECK_PAIRS = 128;

/**
 * 実機同様の128手ツモを生成する。
 * - 4色×64個 = 256個の均等プールを Fisher–Yates でシャッフル。
 * - 最初の2手(先頭4個)は3色以内に収める(実機の慣例。初手パターンは14通りになる)。
 *   除外色が先頭4個に現れた場合、それ以降で最初に見つかる別色と入れ替える。
 */
export function createTsumoDeck(seed: number): TsumoSource {
  const rng = new SeededRng(seed);
  const colors = DEFAULT_COLORS;
  const pool: Color[] = [];
  for (const c of colors) {
    for (let i = 0; i < (DECK_PAIRS * 2) / colors.length; i++) pool.push(c);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  const excluded = colors[rng.nextInt(colors.length)]!;
  for (let i = 0; i < 4; i++) {
    if (pool[i] !== excluded) continue;
    for (let j = 4; j < pool.length; j++) {
      if (pool[j] !== excluded) {
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
        break;
      }
    }
  }

  return {
    seed,
    pairAt(index: number): Pair {
      const i = ((index % DECK_PAIRS) + DECK_PAIRS) % DECK_PAIRS;
      return { axis: pool[i * 2]!, child: pool[i * 2 + 1]! };
    },
  };
}
