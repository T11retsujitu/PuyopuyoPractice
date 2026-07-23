import type { Field } from '../../core/types';
import { COLOR_NAMES_JA, COLS } from '../../core/types';
import { heights } from '../../core/field';
import { bestIgnition, probeIgnitions } from '../../core/probe';
import type { Candidate } from '../evaluator';
import type { SkillLevel } from '../profiles';
import { DEMERIT_TEXTS, MERIT_TEXTS, renderText, type DemeritId, type MeritId } from './texts';

export interface Explanation {
  id: MeritId | DemeritId;
  type: 'merit' | 'demerit';
  text: string;
}

/** 設置前盤面から解説に必要な文脈を作る(1手につき1回だけ計算)。 */
export interface ExplainContext {
  skill: SkillLevel;
  maxChainBefore: number;
  bumpinessBefore: number;
  h3Before: number;
  /** 土台モードのときのフォーム名(例: 'GTR')。 */
  formName?: string;
}

export function buildExplainContext(
  beforeField: Field,
  skill: SkillLevel,
  formName?: string,
): ExplainContext {
  const h = heights(beforeField);
  return {
    skill,
    maxChainBefore: bestIgnition(probeIgnitions(beforeField))?.chains ?? 0,
    bumpinessBefore: h.slice(0, -1).reduce((sum, v, i) => sum + Math.abs((h[i + 1] ?? 0) - v), 0),
    h3Before: h[2] ?? 0,
    ...(formName ? { formName } : {}),
  };
}

/** 谷になっている列(1-indexed)を探す(解説の文言用)。 */
function valleyCol(after: Field): number | null {
  const h = heights(after);
  for (let c = 1; c < COLS - 1; c++) {
    if ((h[c - 1] ?? 0) >= (h[c] ?? 0) + 3 && (h[c + 1] ?? 0) >= (h[c] ?? 0) + 3) return c + 1;
  }
  if ((h[1] ?? 0) >= (h[0] ?? 0) + 3) return 1;
  if ((h[4] ?? 0) >= (h[5] ?? 0) + 3) return 6;
  return null;
}

const MAX_ITEMS = 3;

/**
 * 一手のメリット・デメリットを生成する。
 * 「正解/不正解」を断定する文言は使わない(このツールのコンセプト)。
 */
export function explainCandidate(c: Candidate, ctx: ExplainContext): Explanation[] {
  const f = c.features;
  const skill = ctx.skill;
  const merits: Explanation[] = [];
  const demerits: Explanation[] = [];
  const merit = (id: MeritId, params: Record<string, string | number> = {}) =>
    merits.push({ id, type: 'merit', text: renderText(MERIT_TEXTS[id], skill, params) });
  const demerit = (id: DemeritId, params: Record<string, string | number> = {}) =>
    demerits.push({ id, type: 'demerit', text: renderText(DEMERIT_TEXTS[id], skill, params) });

  const inDanger = ctx.h3Before >= 10;
  const form = ctx.formName ?? '土台';

  // --- 致命的なものを最優先 ---
  if (f.dead) {
    demerit('dead');
    return [...merits, ...demerits];
  }

  // --- 土台モード ---
  if (f.template) {
    if (f.template.matchedDelta > 0 && f.template.violationDelta <= 0) {
      merit('templateFit', { form, n: f.template.matchedDelta });
    }
    if (f.template.violationDelta > 0) {
      demerit('templateBreak', { form, n: f.template.violationDelta });
    }
    if (f.template.escape) {
      merit('escapeOk');
    }
    // escape でも合致でも崩しでもない = 進められるツモなのに進めなかった。
    if (
      !f.template.escape &&
      f.template.matchedDelta <= 0 &&
      f.template.violationDelta <= 0
    ) {
      demerit('missedTemplate');
    }
  }

  // --- 消した手 ---
  if (f.immediateChains > 0) {
    if (inDanger) {
      merit('dangerClear');
    } else if (f.immediateChains <= 2 && ctx.maxChainBefore > f.immediateChains) {
      demerit('smallPop', { chains: f.immediateChains, potential: ctx.maxChainBefore });
    } else if (f.immediateChains >= 3) {
      merit('bigPop', { chains: f.immediateChains });
    }
    if (f.allClear) merit('allClear');
    if (f.overGroupCells > 0) {
      demerit('overGroup', { size: 4 + f.overGroupCells });
    }
  }

  // --- 連鎖ポテンシャル ---
  if (f.maxChain > ctx.maxChainBefore && f.maxChain >= 2) {
    merit('chainExtend', { before: ctx.maxChainBefore, after: f.maxChain });
  } else if (
    f.immediateChains === 0 &&
    f.maxChain < ctx.maxChainBefore &&
    ctx.maxChainBefore >= 2
  ) {
    demerit('chainShrink', { before: ctx.maxChainBefore, after: f.maxChain });
  }
  if (f.maxChain >= 2 && !f.triggerBlocked && f.bestIgnition) {
    merit('keepTrigger', {
      col: f.bestIgnition.col + 1,
      color: COLOR_NAMES_JA[f.bestIgnition.color],
      chains: f.maxChain,
    });
  }
  if (f.triggerBlocked) {
    demerit('triggerBlock');
  }

  // --- 連結 ---
  if (f.newConn3 > 0) merit('conn3');
  else if (f.newConn2 > 0) merit('conn2');

  // --- 形・安全 ---
  if (f.chigiriHeightDiff > 0) {
    demerit('chigiri', { d: f.chigiriHeightDiff });
  } else if (skill === 'beginner' && f.immediateChains === 0) {
    merit('noChigiri');
  }
  const vCol = valleyCol(c.chainResult.field);
  if ((f.deepValleys > 0 || f.edgeValleys > 0) && vCol !== null) {
    demerit('valley', { col: vCol });
  }
  if (f.buriedIsolated > 0) demerit('buried');
  const h3After = heights(c.chainResult.field)[2] ?? 0;
  if (h3After >= 9) demerit('thirdHigh', { h: h3After });
  if (f.vanishedCount > 0) demerit('vanished');
  if (
    f.bumpiness <= ctx.bumpinessBefore - 2 &&
    ctx.bumpinessBefore > 6 &&
    f.immediateChains === 0
  ) {
    merit('flat');
  }

  return [...merits.slice(0, MAX_ITEMS), ...demerits.slice(0, MAX_ITEMS)];
}

/** 候補カード用の一言サマリ(最も特徴的な点をひとつ)。 */
export function candidateReason(c: Candidate, ctx: ExplainContext): string {
  const f = c.features;
  const form = ctx.formName ?? '土台';
  if (f.dead) return '窒息してしまう手';
  if (f.template) {
    if (f.template.escape) return '合わないツモを逃がす';
    if (f.template.matchedDelta > 0 && f.template.violationDelta <= 0)
      return `${form}の形を${f.template.matchedDelta}マス進める`;
    if (f.template.violationDelta > 0) return `${form}の形を崩してしまう`;
  }
  if (f.immediateChains > 0 && ctx.h3Before >= 10) return '消して危険を回避する';
  if (f.immediateChains >= 3) return `${f.immediateChains}連鎖を発火する`;
  if (f.maxChain > ctx.maxChainBefore && f.maxChain >= 2) return `想定連鎖を${f.maxChain}連鎖に伸ばす`;
  if (f.maxChain >= 2 && !f.triggerBlocked) return `${f.maxChain}連鎖の発火点をキープ`;
  if (f.newConn3 > 0) return '3連結を作る';
  if (f.newConn2 > 0) return '同色をつなげる';
  if (f.chigiriHeightDiff === 0 && f.bumpiness <= ctx.bumpinessBefore) return '平らに整地する';
  return 'バランス重視';
}
