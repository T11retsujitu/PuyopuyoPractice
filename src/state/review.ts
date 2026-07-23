import type { Field, Pair, Placement } from '../core/types';
import { applyGravity, cloneField } from '../core/field';
import type { ChainStep } from '../core/chain';
import type { Grade, MoveEvaluation } from '../eval/evaluator';
import {
  GRADE_LABELS,
  evaluateAllPlacements,
  evaluateMove,
  type Candidate,
  type EvalContext,
} from '../eval/evaluator';
import {
  buildExplainContext,
  candidateReason,
  explainCandidate,
  type Explanation,
} from '../eval/explain/explain';

export interface CandidateView {
  candidate: Candidate;
  reason: string;
  explanations: Explanation[];
}

/** 一手のレビュー(評価+解説)をまとめた表示用データ。 */
export interface MoveReview {
  grade: Grade;
  gradeLabel: string;
  scoreGap: number;
  player: CandidateView;
  candidates: CandidateView[];
  pairFitsTemplate: boolean | undefined;
  evaluation: MoveEvaluation;
}

export function buildReview(
  field: Field,
  pair: Pair,
  placement: Placement,
  ctx: EvalContext,
): MoveReview | null {
  const evaluation = evaluateMove(field, pair, placement, ctx);
  if (!evaluation) return null;
  const explainCtx = buildExplainContext(field, ctx.skill, ctx.template?.nameJa);
  const toView = (c: Candidate): CandidateView => ({
    candidate: c,
    reason: candidateReason(c, explainCtx),
    explanations: explainCandidate(c, explainCtx),
  });
  return {
    grade: evaluation.grade,
    gradeLabel: GRADE_LABELS[evaluation.grade],
    scoreGap: evaluation.bestScore - evaluation.player.score,
    player: toView(evaluation.player),
    candidates: evaluation.candidates.map(toView),
    pairFitsTemplate: evaluation.pairFitsTemplate,
    evaluation,
  };
}

/** 設置前ヒント用: 上位候補を解説つきで返す。 */
export function buildHints(
  field: Field,
  pair: Pair,
  ctx: EvalContext,
  count: number,
): CandidateView[] {
  const explainCtx = buildExplainContext(field, ctx.skill, ctx.template?.nameJa);
  return evaluateAllPlacements(field, pair, ctx)
    .slice(0, count)
    .map((c) => ({
      candidate: c,
      reason: candidateReason(c, explainCtx),
      explanations: explainCandidate(c, explainCtx),
    }));
}

/**
 * 連鎖アニメーション用: 設置直後の盤面から各ステップ後の盤面を再構築する。
 * timeline[0] = 設置直後(重力適用済み)、timeline[i] = i ステップ消去後。
 */
export function buildChainTimeline(placedField: Field, steps: ChainStep[]): Field[] {
  const timeline: Field[] = [applyGravity(placedField)];
  let current = timeline[0]!;
  for (const step of steps) {
    const next = cloneField(current);
    for (const g of step.groups) {
      for (const { col, row } of g.cells) {
        next[col]![row] = null;
      }
    }
    current = applyGravity(next);
    timeline.push(current);
  }
  return timeline;
}
