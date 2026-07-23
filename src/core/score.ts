import type { Group } from './chain';

/** ぷよぷよ通の連鎖ボーナス (1連鎖目〜19連鎖目)。4連鎖目以降は +32。 */
export const CHAIN_POWER: readonly number[] = [
  0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512,
];

/** 同時消し色数ボーナス: 1色=0, 2色=3, 3色=6, 4色=12, 5色=24。 */
export const COLOR_BONUS: readonly number[] = [0, 0, 3, 6, 12, 24];

/** 連結数ボーナス: 4個=0, 5個=2, ..., 11個以上=10。 */
export function groupBonus(size: number): number {
  if (size <= 4) return 0;
  if (size >= 11) return 10;
  return [0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7][size] ?? 0;
}

/**
 * 1連鎖ステップの得点 = 10 × 消去数 × clamp(連鎖ボーナス + 色ボーナス + Σ連結ボーナス, 1, 999)
 * chainIndex は 1-indexed(1連鎖目 = 1)。
 */
export function stepScore(chainIndex: number, groups: readonly Group[]): number {
  const cleared = groups.reduce((sum, g) => sum + g.cells.length, 0);
  const colors = new Set(groups.map((g) => g.color)).size;
  const bonus =
    (CHAIN_POWER[chainIndex - 1] ?? CHAIN_POWER[CHAIN_POWER.length - 1] ?? 0) +
    (COLOR_BONUS[colors] ?? 0) +
    groups.reduce((sum, g) => sum + groupBonus(g.cells.length), 0);
  return 10 * cleared * Math.min(999, Math.max(1, bonus));
}
