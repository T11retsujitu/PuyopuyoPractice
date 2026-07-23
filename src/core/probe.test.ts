import { describe, expect, it } from 'vitest';
import { fieldFromRows } from './field';
import { bestIgnition, probeIgnitions } from './probe';

describe('probeIgnitions', () => {
  it('finds a 1-puyo ignition', () => {
    // R が3つ並んでいる: 4列目に R を1個置けば1連鎖。
    const f = fieldFromRows(['RRR...']);
    const igs = probeIgnitions(f);
    const rIgs = igs.filter((ig) => ig.color === 'R');
    expect(rIgs.length).toBeGreaterThan(0);
    expect(rIgs.some((ig) => ig.puyosNeeded === 1 && ig.chains === 1)).toBe(true);
  });

  it('finds a 2-puyo ignition when 1 is not enough', () => {
    // R が2つ: 縦に2個置けば1連鎖になる列がある。
    const f = fieldFromRows(['RR....']);
    const igs = probeIgnitions(f);
    expect(igs.some((ig) => ig.color === 'R' && ig.puyosNeeded === 2 && ig.chains >= 1)).toBe(true);
    expect(igs.some((ig) => ig.color === 'R' && ig.puyosNeeded === 1)).toBe(false);
  });

  it('detects multi-chain potential (階段積みの発火点)', () => {
    // 発火点が空の階段積み: 1列目に R を置くと5連鎖。
    const f = fieldFromRows([
      '.GBYR.',
      '.GBYR.',
      'RGBYR.',
      'RRGBYR',
    ]);
    const best = bestIgnition(probeIgnitions(f));
    expect(best).not.toBeNull();
    expect(best!.chains).toBe(5);
    expect(best!.color).toBe('R');
    expect(best!.col).toBe(0);
  });

  it('returns empty for an empty-ish board', () => {
    const f = fieldFromRows(['G.....']);
    expect(probeIgnitions(f)).toHaveLength(0);
  });
});
