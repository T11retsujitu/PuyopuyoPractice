/** ぷよの色。v1 では4色 (R/G/B/Y)。P は将来の5色対応用。 */
export type Color = 'R' | 'G' | 'B' | 'Y' | 'P';

/** 盤面の1マス。null = 空。 */
export type Cell = Color | null;

export const COLS = 6;
export const VISIBLE_ROWS = 12;
/** 13段目は幽霊段: ぷよは存在できるが連結判定に参加しない。14段目は存在しない。 */
export const TOTAL_ROWS = 13;

/** 0-indexed。row 0 が最下段。 */
export interface CellPos {
  col: number;
  row: number;
}

/** 窒息点 = 3列目12段目。ここが埋まると敗北。 */
export const DEATH_CELL: CellPos = { col: 2, row: 11 };

/** [col][row] の2次元配列。長さ COLS × TOTAL_ROWS。 */
export type Field = readonly (readonly Cell[])[];

/** ツモ1手。axis = 軸ぷよ、child = 子ぷよ。 */
export interface Pair {
  axis: Color;
  child: Color;
}

/** 子ぷよの位置: 0=上, 1=右, 2=下, 3=左。 */
export type Rotation = 0 | 1 | 2 | 3;

/** 設置。col は軸ぷよの列 (0-indexed)。 */
export interface Placement {
  col: number;
  rot: Rotation;
}

export const DEFAULT_COLORS: readonly Color[] = ['R', 'G', 'B', 'Y'];

export const COLOR_NAMES_JA: Record<Color, string> = {
  R: '赤',
  G: '緑',
  B: '青',
  Y: '黄',
  P: '紫',
};
