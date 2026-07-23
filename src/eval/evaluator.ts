import type { Field, Pair, Placement } from '../core/types';
import { heights } from '../core/field';
import { resolveChains, type ChainResult } from '../core/chain';
import {
  applyPlacement,
  enumeratePlacements,
  type PlaceOutcome,
} from '../core/placement';
import { extractFeatures, type MoveFeatures, type TemplateContext } from './features';
import { WEIGHT_PROFILES, type SkillLevel, type WeightProfile } from './profiles';
import type { FoundationTemplate, MatchResult } from './templates/types';
import { fitsCurrentPair, matchTemplate } from './templates/matcher';

export interface EvalContext {
  skill: SkillLevel;
  /** 土台練習モードのときだけ指定する。 */
  template?: FoundationTemplate;
}

export interface Candidate {
  placement: Placement;
  outcome: PlaceOutcome;
  chainResult: ChainResult;
  features: MoveFeatures;
  score: number;
  /** 土台モード時の照合結果(解説・お手本表示用)。 */
  templateMatch?: MatchResult;
}

export type Grade = 'S' | 'A' | 'B' | 'C';

export const GRADE_LABELS: Record<Grade, string> = {
  S: '最有力候補と同等の一手',
  A: '有力な一手',
  B: '一考の余地あり',
  C: '他の候補が有力',
};

export interface MoveEvaluation {
  player: Candidate;
  /** プレイヤーの手を除いた上位候補(スコア降順)。 */
  candidates: Candidate[];
  grade: Grade;
  bestScore: number;
  /** 土台モード: このツモで土台を進められたか(false なら逃がしが正解筋)。 */
  pairFitsTemplate?: boolean;
}

export function scoreFeatures(f: MoveFeatures, w: WeightProfile, hBefore3: number): number {
  if (f.dead) return -1000;
  let s = 0;
  s += w.chigiriPerStep * f.chigiriHeightDiff;
  s += w.bumpinessOver6 * Math.max(0, f.bumpiness - 6);
  s += w.deepValley * f.deepValleys;
  s += w.edgeValley * f.edgeValleys;
  s += w.deadRisk * f.deadRisk;
  s += w.conn2 * f.newConn2;
  s += w.conn3 * f.newConn3;
  s += w.overGroupCell * f.overGroupCells;
  s += w.buriedIsolated * f.buriedIsolated;
  s += w.maxChainPer * f.maxChain;
  s += w.ignitionFlexPer * Math.max(0, f.ignitionFlex - 1);
  if (f.triggerBlocked) s += w.triggerBlocked;
  if (f.triggerNeeds2) s += w.triggerNeeds2;
  s += w.vanishedPer * f.vanishedCount;
  const inDanger = hBefore3 >= 10;
  if (f.immediateChains > 0) {
    if (inDanger) {
      s += w.popInDanger;
    } else if (f.immediateChains <= 2) {
      s += w.smallPopSafe * f.immediateChains;
    } else {
      // 3連鎖以上を発火: 育てた連鎖を打つこと自体は悪くない。控えめに加点。
      s += 1.5 * f.immediateChains;
    }
  }
  if (f.template) {
    s += w.templateMatchPerCell * f.template.matchedDelta;
    s += w.templateViolationPerCell * Math.max(0, f.template.violationDelta);
    if (f.template.escape) s += w.templateEscape;
  }
  return s;
}

function evaluatePlacement(
  field: Field,
  pair: Pair,
  placement: Placement,
  ctx: EvalContext,
  shared: { templateBefore?: MatchResult; pairFits?: boolean },
): Candidate | null {
  const outcome = applyPlacement(field, pair, placement);
  if (!outcome) return null;
  const chainResult = resolveChains(outcome.field);

  let templateCtx: TemplateContext | undefined;
  let templateMatch: MatchResult | undefined;
  if (ctx.template && shared.templateBefore) {
    templateMatch = matchTemplate(chainResult.field, ctx.template);
    templateCtx = {
      before: shared.templateBefore,
      after: templateMatch,
      pairFits: shared.pairFits ?? true,
    };
  }

  const features = extractFeatures(field, outcome, chainResult, templateCtx);
  const score = scoreFeatures(features, WEIGHT_PROFILES[ctx.skill], heights(field)[2] ?? 0);
  return {
    placement,
    outcome,
    chainResult,
    features,
    score,
    ...(templateMatch ? { templateMatch } : {}),
  };
}

/** 全設置候補を評価し、同一盤面になる候補を統合してスコア降順で返す。 */
export function evaluateAllPlacements(field: Field, pair: Pair, ctx: EvalContext): Candidate[] {
  const shared: { templateBefore?: MatchResult; pairFits?: boolean } = {};
  if (ctx.template) {
    shared.templateBefore = matchTemplate(field, ctx.template);
    shared.pairFits = fitsCurrentPair(field, ctx.template, pair);
  }
  const seen = new Map<string, Candidate>();
  for (const p of enumeratePlacements(field, pair)) {
    const c = evaluatePlacement(field, pair, p, ctx, shared);
    if (!c) continue;
    const key = c.chainResult.field.map((col) => col.map((cell) => cell ?? '.').join('')).join('|');
    const existing = seen.get(key);
    if (!existing || c.score > existing.score) seen.set(key, c);
  }
  return [...seen.values()].sort((a, b) => b.score - a.score);
}

/** 練度別の候補表示数。 */
export const CANDIDATE_COUNT: Record<SkillLevel, number> = {
  beginner: 3,
  intermediate: 4,
  advanced: 5,
};

function gradeFromGap(gap: number): Grade {
  if (gap <= 2) return 'S';
  if (gap <= 8) return 'A';
  if (gap <= 18) return 'B';
  return 'C';
}

/**
 * プレイヤーの一手を評価する。
 * グレードは「最有力候補とのスコア差」による相対比較であり、正解/不正解ではない。
 */
export function evaluateMove(
  field: Field,
  pair: Pair,
  playerPlacement: Placement,
  ctx: EvalContext,
): MoveEvaluation | null {
  const shared: { templateBefore?: MatchResult; pairFits?: boolean } = {};
  if (ctx.template) {
    shared.templateBefore = matchTemplate(field, ctx.template);
    shared.pairFits = fitsCurrentPair(field, ctx.template, pair);
  }
  const player = evaluatePlacement(field, pair, playerPlacement, ctx, shared);
  if (!player) return null;

  const all = evaluateAllPlacements(field, pair, ctx);
  const bestScore = all[0]?.score ?? player.score;
  const playerKey = player.chainResult.field
    .map((col) => col.map((cell) => cell ?? '.').join(''))
    .join('|');
  const others = all
    .filter(
      (c) =>
        c.chainResult.field.map((col) => col.map((cell) => cell ?? '.').join('')).join('|') !==
        playerKey,
    )
    .slice(0, CANDIDATE_COUNT[ctx.skill]);

  return {
    player,
    candidates: others,
    grade: gradeFromGap(bestScore - player.score),
    bestScore,
    ...(shared.pairFits !== undefined ? { pairFitsTemplate: shared.pairFits } : {}),
  };
}
