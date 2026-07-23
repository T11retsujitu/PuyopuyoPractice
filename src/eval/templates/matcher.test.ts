import { describe, expect, it } from 'vitest';
import type { Cell, Color, Field } from '../../core/types';
import { DEFAULT_COLORS, TOTAL_ROWS, COLS } from '../../core/types';
import { fieldFromRows } from '../../core/field';
import { FOUNDATION_TEMPLATES, STAIRS, KAGI, GTR } from './index';
import { fitsCurrentPair, matchTemplate, matchVariant } from './matcher';
import type { TemplateVariant } from './types';

/** バリアントから貪欲彩色で完成形の盤面を作るテストヘルパ。 */
function fieldFromVariant(variant: TemplateVariant): { field: Field; assignment: Map<string, Color> } {
  const vars = [...new Set(variant.cells.map((c) => c.v))].sort();
  const posVar = new Map<string, string>();
  for (const c of variant.cells) posVar.set(`${c.pos.col},${c.pos.row}`, c.v);
  const assignment = new Map<string, Color>();
  for (const v of vars) {
    const conflicting = new Set<Color>();
    for (const c of variant.cells) {
      if (c.v !== v) continue;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nv = posVar.get(`${c.pos.col + dc},${c.pos.row + dr}`);
        if (nv && nv !== v) {
          const assigned = assignment.get(nv);
          if (assigned) conflicting.add(assigned);
        }
      }
    }
    const color = DEFAULT_COLORS.find((col) => !conflicting.has(col));
    if (!color) throw new Error('greedy coloring failed');
    assignment.set(v, color);
  }
  const cols: Cell[][] = Array.from({ length: COLS }, () => Array<Cell>(TOTAL_ROWS).fill(null));
  for (const c of variant.cells) {
    cols[c.pos.col]![c.pos.row] = assignment.get(c.v)!;
  }
  return { field: cols, assignment };
}

describe('matchVariant on canonical completed forms', () => {
  const allVariants = Object.values(FOUNDATION_TEMPLATES).flatMap((t) => t.variants);
  for (const variant of allVariants) {
    it(`${variant.name}: full form matches with zero violations`, () => {
      const { field } = fieldFromVariant(variant);
      const r = matchVariant(field, variant);
      expect(r.violationCells).toHaveLength(0);
      expect(r.requiredMatched).toBe(r.requiredTotal);
      expect(r.matchedCount).toBe(variant.cells.length);
    });
  }
});

describe('matchTemplate', () => {
  it('picks the correct variant for a mirrored form', () => {
    const right = STAIRS.variants.find((v) => v.name === 'stairs-right')!;
    const { field } = fieldFromVariant(right);
    const r = matchTemplate(field, STAIRS);
    expect(r.variantName).toBe('stairs-right');
    expect(r.violationCells).toHaveLength(0);
  });

  it('recoloring one required cell yields exactly one violation', () => {
    const left = STAIRS.variants[0]!;
    const { field, assignment } = fieldFromVariant(left);
    const mutable = field.map((col) => [...col]);
    // (2列目, 1段目) は変数 a のセル。a と隣接変数以外の色に変える。
    const aColor = assignment.get('a')!;
    const other = DEFAULT_COLORS.find((c) => c !== aColor && c !== assignment.get('b'))!;
    mutable[1]![0] = other;
    const r = matchTemplate(mutable, STAIRS);
    expect(r.violationCells).toHaveLength(1);
    expect(r.violationCells[0]).toEqual({ col: 1, row: 0 });
  });

  it('partial board reports partial progress without violations', () => {
    // 階段積み(左)の a(R) と b(G) を途中まで積んだ状態。
    const f = fieldFromRows(['RG....', 'RRG...']);
    const r = matchTemplate(f, STAIRS);
    expect(r.violationCells).toHaveLength(0);
    expect(r.matchedCount).toBeGreaterThanOrEqual(4);
    expect(r.requiredMatched).toBeLessThan(r.requiredTotal);
  });

  it('GTR core has 8 required cells and 4 suggested cells', () => {
    const left = GTR.variants[0]!;
    expect(left.cells.filter((c) => c.kind === 'required')).toHaveLength(8);
    expect(left.cells.filter((c) => c.kind === 'suggested')).toHaveLength(4);
    expect(left.dumpCols).toEqual([4, 5]);
  });

  it('KAGI has 4 variants (2-1-1 / 1-1-2 × 左右)', () => {
    expect(KAGI.variants).toHaveLength(4);
  });
});

describe('fitsCurrentPair', () => {
  it('empty board: any pair can start any form', () => {
    const empty = fieldFromRows(['......']);
    expect(fitsCurrentPair(empty, GTR, { axis: 'R', child: 'G' })).toBe(true);
    expect(fitsCurrentPair(empty, STAIRS, { axis: 'R', child: 'R' })).toBe(true);
  });

  it('completed form: no pair can extend it further', () => {
    const left = STAIRS.variants[0]!;
    const { field } = fieldFromVariant(left);
    expect(fitsCurrentPair(field, STAIRS, { axis: 'R', child: 'G' })).toBe(false);
  });
});
