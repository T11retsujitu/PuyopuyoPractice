import type { Color, Field } from '../core/types';
import { COLS, VISIBLE_ROWS } from '../core/types';
import { heights, isDead } from '../core/field';
import type { ChainResult } from '../core/chain';
import type { PlaceOutcome } from '../core/placement';
import { isReachable } from '../core/placement';
import { bestIgnition, probeIgnitions, type Ignition } from '../core/probe';
import type { MatchResult } from './templates/types';

/** 一手の評価に使う特徴量。設置前 → 設置+連鎖解決後 の差分・状態から計算する。 */
export interface MoveFeatures {
  /** ちぎりの段差(0 = ちぎりなし)。 */
  chigiriHeightDiff: number;
  /** 連鎖解決後の凸凹度 Σ|h[i+1]-h[i]|。 */
  bumpiness: number;
  /** 両隣より3段以上低い内側の谷の数。 */
  deepValleys: number;
  /** 端(1・6列目)が隣より3段以上低い数。 */
  edgeValleys: number;
  /** 3列目の高さリスク max(0, h3-8)^2。 */
  deadRisk: number;
  /** この手で敗北する(3列目12段目が埋まる)。 */
  dead: boolean;
  /** 置いたぷよが同色2連結になった数。 */
  newConn2: number;
  /** 置いたぷよが同色3連結になった数。 */
  newConn3: number;
  /** 即時連鎖の初撃で5個以上まとめて消えた「無駄」の個数(サイズ-4の合計)。 */
  overGroupCells: number;
  /** 孤立したまま上を塞がれたぷよの数。 */
  buriedIsolated: number;
  /** この手で発生した連鎖数(0 = 消えていない)。 */
  immediateChains: number;
  immediateScore: number;
  allClear: boolean;
  /** 13段目からあふれて消滅したぷよの数。 */
  vanishedCount: number;
  /** 連鎖解決後の盤面の最大想定連鎖(発火力探索)。 */
  maxChain: number;
  /** 最大想定連鎖を出せる発火点(色×列)の数。最大3でキャップ。 */
  ignitionFlex: number;
  /** 最良の発火に縦2個が必要。 */
  triggerNeeds2: boolean;
  /** 最良連鎖の発火点へ現在到達できない(12段目通過ルール)。 */
  triggerBlocked: boolean;
  /** 発火点として最良の Ignition(解説用)。 */
  bestIgnition: Ignition | null;
  /** 土台練習モード時のテンプレ照合差分。 */
  template?: {
    matchedDelta: number;
    violationDelta: number;
    /** このツモは土台に合わず、逃がし置きをした。 */
    escape: boolean;
  };
}

export interface TemplateContext {
  before: MatchResult;
  after: MatchResult;
  /** このツモで土台を進められる設置が存在するか。 */
  pairFits: boolean;
}

function countValleys(h: number[]): { deep: number; edge: number } {
  let deep = 0;
  let edge = 0;
  for (let c = 1; c < COLS - 1; c++) {
    if ((h[c - 1] ?? 0) >= (h[c] ?? 0) + 3 && (h[c + 1] ?? 0) >= (h[c] ?? 0) + 3) deep++;
  }
  if ((h[1] ?? 0) >= (h[0] ?? 0) + 3) edge++;
  if ((h[4] ?? 0) >= (h[5] ?? 0) + 3) edge++;
  return { deep, edge };
}

/** 指定セルを含む同色連結成分(12段目まで)。空セルなら null。 */
function groupAt(f: Field, col: number, row: number): Set<string> | null {
  const color = f[col]?.[row];
  if (color == null || row >= VISIBLE_ROWS) return null;
  const seen = new Set<string>();
  const stack = [[col, row]] as [number, number][];
  seen.add(`${col},${row}`);
  while (stack.length > 0) {
    const [c, r] = stack.pop()!;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= VISIBLE_ROWS) continue;
      const key = `${nc},${nr}`;
      if (seen.has(key) || f[nc]?.[nr] !== color) continue;
      seen.add(key);
      stack.push([nc, nr]);
    }
  }
  return seen;
}

export function extractFeatures(
  before: Field,
  outcome: PlaceOutcome,
  chainResult: ChainResult,
  templateCtx?: TemplateContext,
): MoveFeatures {
  const placed = outcome.field; // 設置直後(連鎖解決前)
  const after = chainResult.field; // 連鎖解決後
  const hAfter = heights(after);
  const { deep, edge } = countValleys(hAfter);
  const h3 = hAfter[2] ?? 0;

  // 連結: 設置直後の盤面で、置いたぷよの属するグループサイズを見る。
  // ペア2個が同じグループに入った場合は正準セル(グループ内の最小キー)で1回だけ数える。
  let newConn2 = 0;
  let newConn3 = 0;
  let buriedIsolated = 0;
  const countedGroups = new Set<string>();
  for (const cell of outcome.landed) {
    if (cell.row >= VISIBLE_ROWS) continue;
    const group = groupAt(placed, cell.col, cell.row);
    if (!group) continue;
    const canonical = [...group].sort()[0]!;
    if (countedGroups.has(canonical)) continue;
    countedGroups.add(canonical);
    if (group.size === 2) newConn2++;
    else if (group.size === 3) newConn3++;
    else if (group.size === 1 && placed[cell.col]?.[cell.row + 1] != null) buriedIsolated++;
  }

  const overGroupCells = (chainResult.steps[0]?.groups ?? []).reduce(
    (sum, g) => sum + Math.max(0, g.cells.length - 4),
    0,
  );

  const ignitions = probeIgnitions(after);
  const best = bestIgnition(ignitions);
  const maxChain = best?.chains ?? 0;
  const flexIgnitions = ignitions.filter((ig) => ig.chains === maxChain);
  const reachableBest = flexIgnitions.filter((ig) => isReachable(hAfter, ig.col));

  let template: MoveFeatures['template'];
  if (templateCtx) {
    const escape =
      !templateCtx.pairFits &&
      templateCtx.after.violationCells.length <= templateCtx.before.violationCells.length;
    template = {
      matchedDelta: templateCtx.after.matchedCount - templateCtx.before.matchedCount,
      violationDelta:
        templateCtx.after.violationCells.length - templateCtx.before.violationCells.length,
      escape,
    };
  }

  return {
    chigiriHeightDiff: outcome.chigiriHeightDiff,
    bumpiness: hAfter.slice(0, -1).reduce((sum, h, i) => sum + Math.abs((hAfter[i + 1] ?? 0) - h), 0),
    deepValleys: deep,
    edgeValleys: edge,
    deadRisk: Math.max(0, h3 - 8) ** 2,
    dead: isDead(after),
    newConn2,
    newConn3,
    overGroupCells,
    buriedIsolated,
    immediateChains: chainResult.chains,
    immediateScore: chainResult.totalScore,
    allClear: chainResult.allClear,
    vanishedCount: outcome.vanished.length,
    maxChain,
    ignitionFlex: Math.min(3, flexIgnitions.length),
    triggerNeeds2: best?.puyosNeeded === 2,
    triggerBlocked: maxChain > 0 && reachableBest.length === 0,
    bestIgnition: best,
    ...(template ? { template } : {}),
  };
}
