import { describe, expect, it } from 'vitest';
import { createField, fieldFromRows } from '../core/field';
import type { Pair } from '../core/types';
import { evaluateAllPlacements, evaluateMove } from './evaluator';
import { STAIRS } from './templates';

const RG: Pair = { axis: 'R', child: 'G' };
const RR: Pair = { axis: 'R', child: 'R' };

describe('evaluateMove sanity', () => {
  it('playing the top candidate always yields grade S', () => {
    const f = fieldFromRows(['YY....', 'GGRR..']);
    const all = evaluateAllPlacements(f, RG, { skill: 'intermediate' });
    const top = all[0]!;
    const result = evaluateMove(f, RG, top.placement, { skill: 'intermediate' })!;
    expect(result.grade).toBe('S');
  });

  it('a chigiri move scores below the best flat alternative', () => {
    // 1列目だけ高い盤面: 1-2列目の横置きは段差2のちぎりになる。
    const f = fieldFromRows(['Y.....', 'Y.....']);
    const result = evaluateMove(f, RG, { col: 0, rot: 1 }, { skill: 'beginner' })!;
    expect(result.player.features.chigiriHeightDiff).toBe(2);
    expect(result.player.score).toBeLessThan(result.bestScore);
    expect(result.grade).not.toBe('S');
  });

  it('burying an isolated puyo is penalized', () => {
    // (1,1) に R がある盤面に、G を下・R を上で縦置き → G が孤立したまま埋まる。
    const f = fieldFromRows(['R.....']);
    const result = evaluateMove(
      f,
      { axis: 'R', child: 'G' },
      { col: 0, rot: 2 }, // 子(G)が下、軸(R)が上
      { skill: 'beginner' },
    )!;
    expect(result.player.features.buriedIsolated).toBeGreaterThan(0);
    expect(result.player.score).toBeLessThan(result.bestScore);
  });

  it('a suicidal move (窒息) gets grade C and a huge penalty', () => {
    // 3列目を11段まで積む(色を交互にして即消えを防ぐ)。
    const rows = Array.from({ length: 11 }, (_, i) => (i % 2 === 0 ? '..G...' : '..B...'));
    const f = fieldFromRows(rows);
    const result = evaluateMove(f, RG, { col: 2, rot: 0 }, { skill: 'intermediate' })!;
    expect(result.player.features.dead).toBe(true);
    expect(result.player.score).toBe(-1000);
    expect(result.grade).toBe('C');
  });

  it('intermediate punishes premature popping harder than beginner', () => {
    // R3個 + 落ちてくる G で2連鎖になる仕込み済み盤面。RR で即発火する手 vs 温存。
    const f = fieldFromRows(['.GG...', 'RRRGG.']);
    const fire = { col: 0, rot: 0 } as const; // 1列目に RR 縦置き → 即2連鎖
    const beginner = evaluateMove(f, RR, fire, { skill: 'beginner' })!;
    const intermediate = evaluateMove(f, RR, fire, { skill: 'intermediate' })!;
    expect(beginner.player.features.immediateChains).toBe(2);
    const gapB = beginner.bestScore - beginner.player.score;
    const gapI = intermediate.bestScore - intermediate.player.score;
    expect(gapI).toBeGreaterThan(gapB);
  });

  it('candidates are deduped and sorted by score', () => {
    const all = evaluateAllPlacements(createField(), RR, { skill: 'advanced' });
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1]!.score).toBeGreaterThanOrEqual(all[i]!.score);
    }
    // 同色ペアの空盤面: 全11配置が異なる盤面になる。
    expect(all.length).toBe(11);
  });
});

describe('evaluateMove with template (土台モード)', () => {
  it('a form-advancing move outscores a form-breaking move', () => {
    // 階段積み(左)を a=R, b=G で進めている途中。
    const f = fieldFromRows(['RG....', 'RRG...']);
    const advance = evaluateMove(f, { axis: 'G', child: 'G' }, { col: 1, rot: 0 }, {
      skill: 'beginner',
      template: STAIRS,
    })!;
    // b セル (2,3)(2,4) を G で埋める手はテンプレ前進。
    expect(advance.player.features.template?.matchedDelta).toBeGreaterThan(0);
    // 1列目(発火点の上)に関係ない色を置くより高評価のはず。
    expect(advance.grade).toBe('S');
  });

  it('escape is rewarded when the pair does not fit the template', () => {
    // ほぼ完成した階段積み(発火点のみ空き)。YY はどこにも合わない。
    const f = fieldFromRows(['.GBYR.', '.GBYR.', 'RGBYR.', 'RRGBYR']);
    const result = evaluateMove(f, { axis: 'Y', child: 'Y' }, { col: 5, rot: 0 }, {
      skill: 'beginner',
      template: STAIRS,
    })!;
    expect(result.pairFitsTemplate).toBe(false);
    expect(result.player.features.template?.escape).toBe(true);
  });
});
