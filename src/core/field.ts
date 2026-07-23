import type { Cell, Field } from './types';
import { COLS, DEATH_CELL, TOTAL_ROWS } from './types';

export function createField(): Field {
  return Array.from({ length: COLS }, () => Array<Cell>(TOTAL_ROWS).fill(null));
}

export function cloneField(f: Field): Cell[][] {
  return f.map((col) => [...col]);
}

/** 各列の高さ(13段目のぷよも数える)。 */
export function heights(f: Field): number[] {
  return f.map((col) => {
    let h = 0;
    for (let row = TOTAL_ROWS - 1; row >= 0; row--) {
      if (col[row] !== null) {
        h = row + 1;
        break;
      }
    }
    return h;
  });
}

/** 列ごとに下詰めする。おじゃまぷよが無いので単純圧縮でよい。 */
export function applyGravity(f: Field): Field {
  return f.map((col) => {
    const puyos = col.filter((c): c is NonNullable<Cell> => c !== null);
    const next = Array<Cell>(TOTAL_ROWS).fill(null);
    puyos.forEach((c, i) => {
      next[i] = c;
    });
    return next;
  });
}

/** 窒息判定: 3列目12段目が埋まっていたら敗北。 */
export function isDead(f: Field): boolean {
  return f[DEATH_CELL.col]?.[DEATH_CELL.row] != null;
}

export function isAllClear(f: Field): boolean {
  return f.every((col) => col.every((c) => c === null));
}

export function countPuyos(f: Field): number {
  let n = 0;
  for (const col of f) for (const c of col) if (c !== null) n++;
  return n;
}

/**
 * テスト・フィクスチャ用: 行文字列(上の行から)で盤面を作る。
 * '.' = 空、R/G/B/Y/P = 色。各行は6文字。最下段が配列の最後。
 * 13段に満たない上部は空として扱う。
 */
export function fieldFromRows(rows: string[]): Field {
  if (rows.some((r) => r.length !== COLS)) {
    throw new Error('each row must have exactly 6 chars');
  }
  if (rows.length > TOTAL_ROWS) {
    throw new Error('too many rows');
  }
  const f = cloneField(createField());
  rows.forEach((rowStr, i) => {
    const row = rows.length - 1 - i; // 最後の行が row 0(最下段)
    for (let col = 0; col < COLS; col++) {
      const ch = rowStr[col];
      if (ch && ch !== '.') {
        f[col]![row] = ch as NonNullable<Cell>;
      }
    }
  });
  return f;
}

/** デバッグ用: 盤面を行文字列(上から)に変換。 */
export function fieldToRows(f: Field): string[] {
  const rows: string[] = [];
  for (let row = TOTAL_ROWS - 1; row >= 0; row--) {
    let s = '';
    for (let col = 0; col < COLS; col++) {
      s += f[col]?.[row] ?? '.';
    }
    rows.push(s);
  }
  return rows;
}
