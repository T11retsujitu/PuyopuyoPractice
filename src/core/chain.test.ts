import { describe, expect, it } from 'vitest';
import { fieldFromRows } from './field';
import { findGroups, resolveChains } from './chain';
import { stepScore } from './score';

describe('findGroups', () => {
  it('detects a 4-in-a-row group', () => {
    const f = fieldFromRows(['RRRR..']);
    const groups = findGroups(f);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.color).toBe('R');
    expect(groups[0]!.cells).toHaveLength(4);
  });

  it('does not detect groups of 3', () => {
    const f = fieldFromRows(['RRR...']);
    expect(findGroups(f)).toHaveLength(0);
  });

  it('ghost row (13段目) puyos do not join groups', () => {
    // 1列目に R を13個縦積み: 12段目までの12個は消えるが、13段目の1個は連結に参加しない。
    const rows = Array.from({ length: 13 }, () => 'R.....');
    const f = fieldFromRows(rows);
    const groups = findGroups(f);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.cells).toHaveLength(12);
  });
});

describe('resolveChains scoring (ぷよぷよ通)', () => {
  it('single 4-clear scores 40', () => {
    const r = resolveChains(fieldFromRows(['RRRR..']));
    expect(r.chains).toBe(1);
    expect(r.totalScore).toBe(40);
    expect(r.allClear).toBe(true);
  });

  it('5-puyo clear scores 100 (連結ボーナス2)', () => {
    const r = resolveChains(fieldFromRows(['R.....', 'RRRR..']));
    expect(r.chains).toBe(1);
    expect(r.totalScore).toBe(100);
  });

  it('two-color simultaneous clear scores 240 (色ボーナス3)', () => {
    // G×4(左の2×2)と R×4(右の横並び)が同時に消える。
    const r = resolveChains(fieldFromRows(['GG....', 'GGRRRR']));
    expect(r.chains).toBe(1);
    expect(r.totalScore).toBe(10 * 8 * 3);
  });

  it('2-chain: falling puyos trigger the next clear (重力は解決前に適用される)', () => {
    const f = fieldFromRows(['G.....', 'RGGG..', 'RRR...']);
    const r = resolveChains(f);
    expect(r.chains).toBe(2);
    // 1連鎖目: R×4 = 40, 2連鎖目: G×4 = 10×4×8 = 320
    expect(r.totalScore).toBe(360);
  });
});

describe('stepScore', () => {
  it('clamps bonus to minimum 1', () => {
    expect(stepScore(1, [{ color: 'R', cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 }] }])).toBe(40);
  });
});

describe('土台テンプレートの連鎖検証(発火点を埋めた完成形)', () => {
  it('階段積み(3-1)は発火で正確に5連鎖・全消しになる', () => {
    const f = fieldFromRows([
      '.GBYR.',
      'RGBYR.', // 発火点 (1,3) を R で埋めた状態
      'RGBYR.',
      'RRGBYR',
    ]);
    const r = resolveChains(f);
    expect(r.chains).toBe(5);
    expect(r.allClear).toBe(true);
    // 各連鎖4個消し: 40 + 320 + 640 + 1280 + 2560
    expect(r.totalScore).toBe(4840);
  });

  it('カギ積み(2-1-1)は発火で正確に5連鎖・全消しになる', () => {
    const f = fieldFromRows([
      '.GBYR.',
      'RRGBY.', // 発火点 (1,3) を R で埋めた状態
      'RGBYR.',
      'RGBYRR',
    ]);
    const r = resolveChains(f);
    expect(r.chains).toBe(5);
    expect(r.allClear).toBe(true);
    expect(r.totalScore).toBe(4840);
  });

  it('GTR(2階建て+土台先端)は上発火で5連鎖・全消しになる', () => {
    // 1〜3列目が GTR の折り返し。2階の G(2列4段)と接続点の B(3列3段)、
    // 右への土台継続(Y/R)を含む。発火点 (1,4) を R で埋めた状態。
    const f = fieldFromRows([
      'RG.RR.', // (1,4) = 発火ぷよ R
      'RRBYR.',
      'GRGBYR',
      'GGBBYY',
    ]);
    const r = resolveChains(f);
    expect(r.chains).toBe(5);
    expect(r.allClear).toBe(true);
    // 4+5+4+4+4個消し: 40 + 500 + 640 + 1280 + 2560
    expect(r.totalScore).toBe(5020);
  });
});
