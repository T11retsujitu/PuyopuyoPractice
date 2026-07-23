import type { Field, Rotation } from '../core/types';
import { createField, isDead } from '../core/field';
import type { ChainStep } from '../core/chain';
import { createTsumoDeck } from '../core/tsumo';
import type { SkillLevel } from '../eval/profiles';
import { FOUNDATION_TEMPLATES, type FoundationFormId } from '../eval/templates';
import type { EvalContext } from '../eval/evaluator';
import { buildChainTimeline, buildReview, type MoveReview } from './review';

export type Phase = 'placing' | 'resolving' | 'review' | 'gameover';

export type GameMode = 'simple' | 'foundation';

export interface GameConfig {
  mode: GameMode;
  form?: FoundationFormId;
  seed: number;
}

interface Snapshot {
  field: Field;
  tsumoIndex: number;
  totalScore: number;
  moveCount: number;
  allClearCount: number;
  maxChainSeen: number;
}

export interface GameState {
  config: GameConfig;
  skill: SkillLevel;
  field: Field;
  phase: Phase;
  tsumoIndex: number;
  cursor: { col: number; rot: Rotation };
  totalScore: number;
  moveCount: number;
  allClearCount: number;
  maxChainSeen: number;
  /** 連鎖アニメーション用の中間盤面列と進行位置。 */
  chainTimeline: Field[] | null;
  chainSteps: ChainStep[] | null;
  chainStepIndex: number;
  review: MoveReview | null;
  history: Snapshot[];
}

export type GameAction =
  | { type: 'MOVE'; dir: -1 | 1 }
  | { type: 'SET_COL'; col: number }
  | { type: 'ROTATE'; dir: -1 | 1 }
  | { type: 'DROP'; animate: boolean }
  | { type: 'CHAIN_TICK' }
  | { type: 'SKIP_ANIMATION' }
  | { type: 'NEXT_TSUMO' }
  | { type: 'UNDO' }
  | { type: 'RESET'; seed?: number }
  | { type: 'SET_SKILL'; skill: SkillLevel };

export function createInitialState(config: GameConfig, skill: SkillLevel): GameState {
  return {
    config,
    skill,
    field: createField(),
    phase: 'placing',
    tsumoIndex: 0,
    cursor: { col: 2, rot: 0 },
    totalScore: 0,
    moveCount: 0,
    allClearCount: 0,
    maxChainSeen: 0,
    chainTimeline: null,
    chainSteps: null,
    chainStepIndex: 0,
    review: null,
    history: [],
  };
}

/** 回転状態ごとの軸ぷよ可動範囲(壁蹴り相当のクランプ)。 */
function clampCol(col: number, rot: Rotation): number {
  const min = rot === 3 ? 1 : 0;
  const max = rot === 1 ? 4 : 5;
  return Math.min(max, Math.max(min, col));
}

export function evalContextOf(state: GameState): EvalContext {
  const template =
    state.config.mode === 'foundation' && state.config.form
      ? FOUNDATION_TEMPLATES[state.config.form]
      : undefined;
  return { skill: state.skill, ...(template ? { template } : {}) };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MOVE': {
      if (state.phase !== 'placing') return state;
      return {
        ...state,
        cursor: { ...state.cursor, col: clampCol(state.cursor.col + action.dir, state.cursor.rot) },
      };
    }
    case 'SET_COL': {
      if (state.phase !== 'placing') return state;
      return {
        ...state,
        cursor: { ...state.cursor, col: clampCol(action.col, state.cursor.rot) },
      };
    }
    case 'ROTATE': {
      if (state.phase !== 'placing') return state;
      const rot = ((state.cursor.rot + (action.dir === 1 ? 1 : 3)) % 4) as Rotation;
      return { ...state, cursor: { rot, col: clampCol(state.cursor.col, rot) } };
    }
    case 'DROP': {
      if (state.phase !== 'placing') return state;
      const pair = createTsumoDeck(state.config.seed).pairAt(state.tsumoIndex);
      const review = buildReview(state.field, pair, state.cursor, evalContextOf(state));
      if (!review) return state; // 置けない位置
      const player = review.evaluation.player;
      const steps = player.chainResult.steps;
      const snapshot: Snapshot = {
        field: state.field,
        tsumoIndex: state.tsumoIndex,
        totalScore: state.totalScore,
        moveCount: state.moveCount,
        allClearCount: state.allClearCount,
        maxChainSeen: state.maxChainSeen,
      };
      const next: GameState = {
        ...state,
        field: player.chainResult.field,
        totalScore: state.totalScore + player.chainResult.totalScore,
        moveCount: state.moveCount + 1,
        allClearCount: state.allClearCount + (player.chainResult.allClear ? 1 : 0),
        maxChainSeen: Math.max(state.maxChainSeen, player.chainResult.chains),
        review,
        history: [...state.history, snapshot],
        chainTimeline: null,
        chainSteps: null,
        chainStepIndex: 0,
      };
      if (action.animate && steps.length > 0) {
        return {
          ...next,
          phase: 'resolving',
          chainTimeline: buildChainTimeline(player.outcome.field, steps),
          chainSteps: steps,
        };
      }
      return { ...next, phase: isDead(next.field) ? 'gameover' : 'review' };
    }
    case 'CHAIN_TICK': {
      if (state.phase !== 'resolving' || !state.chainSteps) return state;
      const next = state.chainStepIndex + 1;
      if (next >= state.chainSteps.length) {
        return {
          ...state,
          phase: isDead(state.field) ? 'gameover' : 'review',
          chainTimeline: null,
          chainSteps: null,
          chainStepIndex: 0,
        };
      }
      return { ...state, chainStepIndex: next };
    }
    case 'SKIP_ANIMATION': {
      if (state.phase !== 'resolving') return state;
      return {
        ...state,
        phase: isDead(state.field) ? 'gameover' : 'review',
        chainTimeline: null,
        chainSteps: null,
        chainStepIndex: 0,
      };
    }
    case 'NEXT_TSUMO': {
      if (state.phase !== 'review') return state;
      return {
        ...state,
        phase: 'placing',
        tsumoIndex: state.tsumoIndex + 1,
        cursor: { col: 2, rot: 0 },
      };
    }
    case 'UNDO': {
      const snapshot = state.history[state.history.length - 1];
      if (!snapshot) return state;
      return {
        ...state,
        ...snapshot,
        phase: 'placing',
        cursor: { col: 2, rot: 0 },
        review: null,
        chainTimeline: null,
        chainSteps: null,
        chainStepIndex: 0,
        history: state.history.slice(0, -1),
      };
    }
    case 'RESET': {
      return createInitialState(
        { ...state.config, seed: action.seed ?? state.config.seed },
        state.skill,
      );
    }
    case 'SET_SKILL': {
      return { ...state, skill: action.skill };
    }
    default:
      return state;
  }
}
