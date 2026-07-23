import type { Color, Field } from './types';
import { COLS, DEFAULT_COLORS, VISIBLE_ROWS } from './types';
import { cloneField, heights } from './field';
import { resolveChains } from './chain';

/** 発火力探索の結果: 「この色をこの列に置くと何連鎖始まるか」。 */
export interface Ignition {
  color: Color;
  col: number;
  /** 発火に必要な仮想ぷよの個数。 */
  puyosNeeded: 1 | 2;
  chains: number;
  score: number;
}

/**
 * 各色×各列に仮想ぷよを1〜2個落として連鎖をシミュレートし、
 * 発火可能な組み合わせを列挙する(発火力探索)。
 * 2個版は「縦に2個必要な発火点」の検出用で、1個で発火する場合は1個版のみ記録する。
 */
export function probeIgnitions(f: Field): Ignition[] {
  const h = heights(f);
  const result: Ignition[] = [];
  for (const color of DEFAULT_COLORS) {
    for (let col = 0; col < COLS; col++) {
      const base = h[col] ?? 0;
      // 12段目より上に置いた仮想ぷよは連結に参加しないので探索不要。
      if (base >= VISIBLE_ROWS) continue;

      const one = cloneField(f);
      one[col]![base] = color;
      const r1 = resolveChains(one);
      if (r1.chains > 0) {
        result.push({ color, col, puyosNeeded: 1, chains: r1.chains, score: r1.totalScore });
        continue;
      }

      if (base + 1 >= VISIBLE_ROWS) continue;
      const two = cloneField(f);
      two[col]![base] = color;
      two[col]![base + 1] = color;
      const r2 = resolveChains(two);
      if (r2.chains > 0) {
        result.push({ color, col, puyosNeeded: 2, chains: r2.chains, score: r2.totalScore });
      }
    }
  }
  return result;
}

/** 最大連鎖の Ignition(同率なら必要ぷよ数が少ない方、次に得点が高い方)。 */
export function bestIgnition(ignitions: readonly Ignition[]): Ignition | null {
  let best: Ignition | null = null;
  for (const ig of ignitions) {
    if (
      best === null ||
      ig.chains > best.chains ||
      (ig.chains === best.chains && ig.puyosNeeded < best.puyosNeeded) ||
      (ig.chains === best.chains && ig.puyosNeeded === best.puyosNeeded && ig.score > best.score)
    ) {
      best = ig;
    }
  }
  return best;
}
