import type { CellPos } from '../../core/types';
import { COLS } from '../../core/types';
import type { TemplateCell, TemplateVariant } from './types';

/**
 * 行文字列(上の行から)でテンプレートを定義する。
 * - 小文字 = required の色変数
 * - 大文字 = suggested の色変数(小文字と同一変数として扱う)
 * - 'T' = 発火点(照合対象外)
 * - '.' = テンプレート外
 */
export function defineVariant(
  name: string,
  nameJa: string,
  rows: string[],
  dumpCols: number[] = [],
): TemplateVariant {
  if (rows.some((r) => r.length !== COLS)) {
    throw new Error('each template row must have exactly 6 chars');
  }
  const cells: TemplateCell[] = [];
  const triggerCells: CellPos[] = [];
  rows.forEach((rowStr, i) => {
    const row = rows.length - 1 - i;
    for (let col = 0; col < COLS; col++) {
      const ch = rowStr[col]!;
      if (ch === '.') continue;
      if (ch === 'T') {
        triggerCells.push({ col, row });
      } else {
        cells.push({
          pos: { col, row },
          v: ch.toLowerCase(),
          kind: ch === ch.toLowerCase() ? 'required' : 'suggested',
        });
      }
    }
  });
  return { name, nameJa, cells, triggerCells, dumpCols };
}

/** 左右反転バリアントを作る。 */
export function mirrorVariant(v: TemplateVariant, name: string, nameJa: string): TemplateVariant {
  const flip = (p: CellPos): CellPos => ({ col: COLS - 1 - p.col, row: p.row });
  return {
    name,
    nameJa,
    cells: v.cells.map((c) => ({ ...c, pos: flip(c.pos) })),
    triggerCells: v.triggerCells.map(flip),
    dumpCols: v.dumpCols.map((c) => COLS - 1 - c),
  };
}
