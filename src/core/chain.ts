import type { CellPos, Color, Field } from './types';
import { COLS, VISIBLE_ROWS } from './types';
import { applyGravity, cloneField, isAllClear } from './field';
import { stepScore } from './score';

export interface Group {
  color: Color;
  cells: CellPos[];
}

export interface ChainStep {
  /** 1-indexed 連鎖数。 */
  chainIndex: number;
  groups: Group[];
  clearedCount: number;
  scoreDelta: number;
}

export interface ChainResult {
  field: Field;
  steps: ChainStep[];
  chains: number;
  totalScore: number;
  allClear: boolean;
}

/**
 * 4個以上つながった同色グループを列挙する。
 * 幽霊段(13段目)のぷよは連結判定に参加しない(1〜12段目のみ)。
 */
export function findGroups(f: Field): Group[] {
  const visited = Array.from({ length: COLS }, () => Array<boolean>(VISIBLE_ROWS).fill(false));
  const groups: Group[] = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      const color = f[col]?.[row];
      if (color == null || visited[col]![row]) continue;
      const cells: CellPos[] = [];
      const stack: CellPos[] = [{ col, row }];
      visited[col]![row] = true;
      while (stack.length > 0) {
        const pos = stack.pop()!;
        cells.push(pos);
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nc = pos.col + dc;
          const nr = pos.row + dr;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= VISIBLE_ROWS) continue;
          if (visited[nc]![nr]) continue;
          if (f[nc]?.[nr] !== color) continue;
          visited[nc]![nr] = true;
          stack.push({ col: nc, row: nr });
        }
      }
      if (cells.length >= 4) {
        groups.push({ color, cells });
      }
    }
  }
  return groups;
}

/**
 * 連鎖を最後まで解決する。
 * ループ: 重力 → 4個以上のグループを全て同時消去(1ステップに複数グループ・複数色可)
 *       → 得点計算 → 重力 → 消えるものがなくなるまで繰り返し。
 */
export function resolveChains(f: Field): ChainResult {
  let field = applyGravity(f);
  const steps: ChainStep[] = [];
  let totalScore = 0;

  for (;;) {
    const groups = findGroups(field);
    if (groups.length === 0) break;
    const chainIndex = steps.length + 1;
    const scoreDelta = stepScore(chainIndex, groups);
    const clearedCount = groups.reduce((sum, g) => sum + g.cells.length, 0);
    const next = cloneField(field);
    for (const g of groups) {
      for (const { col, row } of g.cells) {
        next[col]![row] = null;
      }
    }
    field = applyGravity(next);
    steps.push({ chainIndex, groups, clearedCount, scoreDelta });
    totalScore += scoreDelta;
  }

  return {
    field,
    steps,
    chains: steps.length,
    totalScore,
    allClear: isAllClear(field),
  };
}
