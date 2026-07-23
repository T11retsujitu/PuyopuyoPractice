import { describe, expect, it } from 'vitest';
import { createField, fieldFromRows, fieldToRows, heights } from './field';
import { applyPlacement, enumeratePlacements } from './placement';
import type { Pair } from './types';

const RG: Pair = { axis: 'R', child: 'G' };
const RR: Pair = { axis: 'R', child: 'R' };

describe('enumeratePlacements', () => {
  it('empty field: 22 placements for a two-color pair', () => {
    expect(enumeratePlacements(createField(), RG)).toHaveLength(22);
  });

  it('empty field: 11 placements for a monochrome pair (対称形を統合)', () => {
    expect(enumeratePlacements(createField(), RR)).toHaveLength(11);
  });

  it('a height-12 wall blocks columns beyond it (12段目通過ルール)', () => {
    // 4列目を12段まで積むと、5・6列目へは到達できない。
    const rows = Array.from({ length: 12 }, () => '...G..');
    const f = fieldFromRows(rows);
    const placements = enumeratePlacements(f, RG);
    const cols = placements.flatMap((p) => (p.rot === 1 ? [p.col, p.col + 1] : p.rot === 3 ? [p.col, p.col - 1] : [p.col]));
    expect(cols.some((c) => c >= 4)).toBe(false);
    // 4列目自体には縦置きできる(幽霊段に軸が乗り、上側は消滅する)。
    expect(placements.some((p) => p.col === 3 && p.rot === 0)).toBe(true);
  });

  it('a height-13 column accepts nothing', () => {
    const rows = Array.from({ length: 13 }, () => 'G.....');
    const f = fieldFromRows(rows);
    const placements = enumeratePlacements(f, RG);
    expect(placements.some((p) => p.col === 0 || (p.rot === 3 && p.col === 1))).toBe(false);
  });
});

describe('applyPlacement', () => {
  it('vertical placement stacks axis below child (rot=0)', () => {
    const out = applyPlacement(createField(), RG, { col: 2, rot: 0 })!;
    expect(out.field[2]![0]).toBe('R');
    expect(out.field[2]![1]).toBe('G');
    expect(out.chigiriHeightDiff).toBe(0);
    expect(out.vanished).toHaveLength(0);
  });

  it('vertical placement with child below (rot=2)', () => {
    const out = applyPlacement(createField(), RG, { col: 2, rot: 2 })!;
    expect(out.field[2]![0]).toBe('G');
    expect(out.field[2]![1]).toBe('R');
  });

  it('horizontal placement over unequal heights records chigiri', () => {
    const f = fieldFromRows(['..G...', '..G...', '..G...']);
    const out = applyPlacement(f, RG, { col: 3, rot: 3 })!; // 軸4列目、子3列目
    expect(out.chigiriHeightDiff).toBe(3);
    expect(out.field[3]![0]).toBe('R');
    expect(out.field[2]![3]).toBe('G');
  });

  it('vertical placement on a height-12 column: axis rests in ghost row, child vanishes', () => {
    const rows = Array.from({ length: 12 }, () => 'G.....');
    const f = fieldFromRows(rows);
    const out = applyPlacement(f, RG, { col: 0, rot: 0 })!;
    expect(out.field[0]![12]).toBe('R');
    expect(out.vanished).toEqual(['child']);
    expect(heights(out.field)[0]).toBe(13);
  });

  it('fieldToRows round-trips fieldFromRows', () => {
    const rows = ['RG....', 'GRRB..'];
    const f = fieldFromRows(rows);
    const back = fieldToRows(f);
    expect(back[11]).toBe('RG....');
    expect(back[12]).toBe('GRRB..');
  });
});
