import type { CellPos, Field, Pair, Placement, Rotation } from './types';
import { COLS, TOTAL_ROWS } from './types';
import { cloneField, heights } from './field';

/**
 * 到達可能性・設置可否の簡易モデル(コード全体でこの規約に従う):
 * - ツモは3列目(index 2)に出現し、軸ぷよが12段目(index 11)・子ぷよが13段目を通って横移動する。
 * - そのため出現列と目的列の「間」の列は高さ11以下(12段目が空)である必要がある。
 * - 目的列自体は高さ12まで許容(ぷよは幽霊段=13段目に置ける)。
 * - 縦置きで13段目からあふれた上側のぷよは消滅する(14段目は存在しない)。
 * - 実機の「まわし」による高所すり抜けは対象外。練習ツールとしての割り切り。
 */

export interface PlaceOutcome {
  field: Field;
  /** 実際に置かれたセル(消滅したぷよは含まない)。 */
  landed: CellPos[];
  /** 横置きで左右の高さが違うときのちぎり段差。縦置き・同高は 0。 */
  chigiriHeightDiff: number;
  /** 13段目からあふれて消滅したぷよ。 */
  vanished: ('axis' | 'child')[];
}

/** 設置でペアが占有する列(軸ぷよの列を先頭に)。 */
export function occupiedCols(p: Placement): number[] {
  if (p.rot === 1) return [p.col, p.col + 1];
  if (p.rot === 3) return [p.col, p.col - 1];
  return [p.col];
}

/** 出現列(3列目)から目的列まで横移動できるか。間の列の12段目が塞がっていたら不可。 */
export function isReachable(h: number[], targetCol: number): boolean {
  const from = 2;
  const lo = Math.min(from, targetCol);
  const hi = Math.max(from, targetCol);
  for (let c = lo + 1; c < hi; c++) {
    if ((h[c] ?? 0) > 11) return false;
  }
  return true;
}

export function isLegal(f: Field, p: Placement): boolean {
  const cols = occupiedCols(p);
  if (cols.some((c) => c < 0 || c >= COLS)) return false;
  const h = heights(f);
  // 目的列は高さ12まで(13段目に置ける)。13まで埋まっていたら置けない。
  if (cols.some((c) => (h[c] ?? 0) >= TOTAL_ROWS)) return false;
  return cols.every((c) => isReachable(h, c));
}

/**
 * 合法な設置を列挙する。
 * 異色ペア: 最大22通り(縦12 + 横10)。同色ペアは対称形を除いて最大11通り。
 */
export function enumeratePlacements(f: Field, pair: Pair): Placement[] {
  const mono = pair.axis === pair.child;
  const result: Placement[] = [];
  const rots: Rotation[] = mono ? [0, 1] : [0, 1, 2, 3];
  for (const rot of rots) {
    for (let col = 0; col < COLS; col++) {
      const p: Placement = { col, rot };
      if (occupiedCols(p).some((c) => c < 0 || c >= COLS)) continue;
      if (isLegal(f, p)) result.push(p);
    }
  }
  return result;
}

/** 設置を適用する(連鎖解決はしない)。不正な設置なら null。 */
export function applyPlacement(f: Field, pair: Pair, p: Placement): PlaceOutcome | null {
  if (!isLegal(f, p)) return null;
  const next = cloneField(f);
  const h = heights(f);
  const landed: CellPos[] = [];
  const vanished: ('axis' | 'child')[] = [];

  const drop = (col: number, color: Pair['axis'], kind: 'axis' | 'child', restRow: number) => {
    if (restRow >= TOTAL_ROWS) {
      vanished.push(kind);
      return;
    }
    next[col]![restRow] = color;
    landed.push({ col, row: restRow });
  };

  if (p.rot === 0 || p.rot === 2) {
    const base = h[p.col] ?? 0;
    if (p.rot === 0) {
      // 子が上: 軸が下に着地し、子がその上。
      drop(p.col, pair.axis, 'axis', base);
      drop(p.col, pair.child, 'child', base + 1);
    } else {
      drop(p.col, pair.child, 'child', base);
      drop(p.col, pair.axis, 'axis', base + 1);
    }
    return { field: next, landed, chigiriHeightDiff: 0, vanished };
  }

  const childCol = p.rot === 1 ? p.col + 1 : p.col - 1;
  const axisBase = h[p.col] ?? 0;
  const childBase = h[childCol] ?? 0;
  drop(p.col, pair.axis, 'axis', axisBase);
  drop(childCol, pair.child, 'child', childBase);
  return {
    field: next,
    landed,
    chigiriHeightDiff: Math.abs(axisBase - childBase),
    vanished,
  };
}

/** 設置キー(同一盤面になる候補の統合などに使用)。 */
export function placementKey(p: Placement): string {
  return `${p.col}:${p.rot}`;
}
