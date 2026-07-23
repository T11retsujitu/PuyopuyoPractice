import { describe, expect, it } from 'vitest';
import { createField, fieldFromRows } from '../../core/field';
import { evaluateMove, type Candidate } from '../evaluator';
import type { MoveFeatures } from '../features';
import { buildExplainContext, candidateReason, explainCandidate, type ExplainContext } from './explain';

/** テキスト選択ロジックの単体テスト用に Candidate を組み立てる。 */
function fakeCandidate(features: Partial<MoveFeatures>): Candidate {
  const base: MoveFeatures = {
    chigiriHeightDiff: 0,
    bumpiness: 0,
    deepValleys: 0,
    edgeValleys: 0,
    deadRisk: 0,
    dead: false,
    newConn2: 0,
    newConn3: 0,
    overGroupCells: 0,
    buriedIsolated: 0,
    immediateChains: 0,
    immediateScore: 0,
    allClear: false,
    vanishedCount: 0,
    maxChain: 0,
    ignitionFlex: 0,
    triggerNeeds2: false,
    triggerBlocked: false,
    bestIgnition: null,
  };
  return {
    placement: { col: 2, rot: 0 },
    outcome: { field: createField(), landed: [], chigiriHeightDiff: 0, vanished: [] },
    chainResult: { field: createField(), steps: [], chains: 0, totalScore: 0, allClear: false },
    features: { ...base, ...features },
    score: 0,
  };
}

const ctx = (over: Partial<ExplainContext> = {}): ExplainContext => ({
  skill: 'beginner',
  maxChainBefore: 0,
  bumpinessBefore: 0,
  h3Before: 0,
  ...over,
});

describe('explainCandidate text selection', () => {
  it('chainExtend fires when 想定連鎖 grows', () => {
    const c = fakeCandidate({
      maxChain: 3,
      bestIgnition: { color: 'R', col: 0, puyosNeeded: 1, chains: 3, score: 0 },
    });
    const ex = explainCandidate(c, ctx({ maxChainBefore: 2 }));
    expect(ex.some((e) => e.id === 'chainExtend' && e.type === 'merit')).toBe(true);
    expect(ex.some((e) => e.id === 'keepTrigger')).toBe(true);
  });

  it('smallPop fires on premature 1-2 chain pops when safe', () => {
    const c = fakeCandidate({ immediateChains: 2 });
    const ex = explainCandidate(c, ctx({ maxChainBefore: 4, skill: 'intermediate' }));
    expect(ex.some((e) => e.id === 'smallPop' && e.type === 'demerit')).toBe(true);
  });

  it('dangerClear (not smallPop) fires when 3列目 is high', () => {
    const c = fakeCandidate({ immediateChains: 2 });
    const ex = explainCandidate(c, ctx({ maxChainBefore: 4, h3Before: 10 }));
    expect(ex.some((e) => e.id === 'dangerClear' && e.type === 'merit')).toBe(true);
    expect(ex.some((e) => e.id === 'smallPop')).toBe(false);
  });

  it('template texts use the form name', () => {
    const c = fakeCandidate({
      template: { matchedDelta: 2, violationDelta: 0, escape: false },
    });
    const ex = explainCandidate(c, ctx({ formName: 'GTR' }));
    const fit = ex.find((e) => e.id === 'templateFit');
    expect(fit).toBeDefined();
    expect(fit!.text).toContain('GTR');
  });

  it('dead short-circuits everything else', () => {
    const c = fakeCandidate({ dead: true, newConn3: 2 });
    const ex = explainCandidate(c, ctx());
    expect(ex).toHaveLength(1);
    expect(ex[0]!.id).toBe('dead');
  });

  it('never contains 正解/不正解/ミス wording (コンセプト遵守)', () => {
    // 代表的な特徴量の組み合わせを一通り出して文言を検査する。
    const variants: Partial<MoveFeatures>[] = [
      { chigiriHeightDiff: 3 },
      { buriedIsolated: 1 },
      { triggerBlocked: true },
      { newConn3: 1 },
      { immediateChains: 4, allClear: true },
      { template: { matchedDelta: -1, violationDelta: 2, escape: false } },
      { template: { matchedDelta: 0, violationDelta: 0, escape: true } },
    ];
    for (const v of variants) {
      for (const skill of ['beginner', 'intermediate', 'advanced'] as const) {
        const texts = explainCandidate(fakeCandidate(v), ctx({ skill, maxChainBefore: 2 }));
        for (const e of texts) {
          expect(e.text).not.toMatch(/正解|不正解|ミス/);
        }
      }
    }
  });
});

describe('integration: real moves produce explanations', () => {
  it('burying move gets the buried demerit', () => {
    const f = fieldFromRows(['R.....']);
    const result = evaluateMove(f, { axis: 'R', child: 'G' }, { col: 0, rot: 2 }, { skill: 'beginner' })!;
    const ex = explainCandidate(result.player, buildExplainContext(f, 'beginner'));
    expect(ex.some((e) => e.id === 'buried')).toBe(true);
  });

  it('candidateReason returns a short label', () => {
    const f = fieldFromRows(['R.....']);
    const result = evaluateMove(f, { axis: 'R', child: 'R' }, { col: 0, rot: 0 }, { skill: 'beginner' })!;
    const reason = candidateReason(result.player, buildExplainContext(f, 'beginner'));
    expect(reason.length).toBeGreaterThan(0);
    expect(reason.length).toBeLessThan(30);
  });
});
