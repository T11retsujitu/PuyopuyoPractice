import type { Color, Field, Pair } from '../../core/types';
import { DEFAULT_COLORS } from '../../core/types';
import { resolveChains } from '../../core/chain';
import { applyPlacement, enumeratePlacements } from '../../core/placement';
import type { FoundationTemplate, MatchResult, TemplateVariant } from './types';

/** 隣接する異変数のペア(同じ色を割り当ててはいけない)。 */
function adjacencyConstraints(v: TemplateVariant): [string, string][] {
  const byPos = new Map<string, { v: string }>();
  for (const c of v.cells) byPos.set(`${c.pos.col},${c.pos.row}`, { v: c.v });
  const pairs = new Set<string>();
  for (const c of v.cells) {
    for (const [dc, dr] of [
      [1, 0],
      [0, 1],
    ] as const) {
      const n = byPos.get(`${c.pos.col + dc},${c.pos.row + dr}`);
      if (n && n.v !== c.v) {
        pairs.add([c.v, n.v].sort().join(''));
      }
    }
  }
  return [...pairs].map((p) => [p[0]!, p[1]!]);
}

/** 1バリアントに対する最良の色割り当てを総当たりで探す(変数 ≤ 5 × 4色 = 最大1024通り)。 */
export function matchVariant(f: Field, variant: TemplateVariant): MatchResult {
  const vars = [...new Set(variant.cells.map((c) => c.v))].sort();
  const constraints = adjacencyConstraints(variant);
  const colors = DEFAULT_COLORS;

  let best: MatchResult | null = null;
  const assignment = new Map<string, Color>();

  const tryAssignment = () => {
    for (const [x, y] of constraints) {
      if (assignment.get(x) === assignment.get(y)) return;
    }
    const matchedCells: MatchResult['matchedCells'] = [];
    const violationCells: MatchResult['violationCells'] = [];
    let requiredMatched = 0;
    let requiredTotal = 0;
    for (const cell of variant.cells) {
      const want = assignment.get(cell.v)!;
      const got = f[cell.pos.col]?.[cell.pos.row] ?? null;
      if (cell.kind === 'required') requiredTotal++;
      if (got === null) continue;
      if (got === want) {
        matchedCells.push(cell.pos);
        if (cell.kind === 'required') requiredMatched++;
      } else if (cell.kind === 'required') {
        violationCells.push(cell.pos);
      }
    }
    const score = matchedCells.length - 2 * violationCells.length;
    if (
      best === null ||
      score > best.score ||
      (score === best.score && requiredMatched > best.requiredMatched)
    ) {
      best = {
        variantName: variant.name,
        variantNameJa: variant.nameJa,
        assignment: new Map(assignment),
        matchedCells,
        violationCells,
        requiredMatched,
        requiredTotal,
        matchedCount: matchedCells.length,
        score,
      };
    }
  };

  const assign = (i: number) => {
    if (i === vars.length) {
      tryAssignment();
      return;
    }
    for (const color of colors) {
      assignment.set(vars[i]!, color);
      assign(i + 1);
    }
  };
  assign(0);

  return best!;
}

/** 全バリアント中の最良マッチ。 */
export function matchTemplate(f: Field, template: FoundationTemplate): MatchResult {
  let best: MatchResult | null = null;
  for (const variant of template.variants) {
    const r = matchVariant(f, variant);
    if (
      best === null ||
      r.score > best.score ||
      (r.score === best.score && r.requiredMatched > best.requiredMatched)
    ) {
      best = r;
    }
  }
  return best!;
}

/**
 * 一手の前後のテンプレ照合。
 * 「後」の盤面に最も合うバリアントを選び、「前」の盤面も同じバリアントで照合する。
 * バリアント(左右の型など)が前後で入れ替わると差分に幽霊違反が出るため、
 * 差分は必ず同一バリアント同士で取る。
 */
export function matchDelta(
  before: Field,
  after: Field,
  template: FoundationTemplate,
): { before: MatchResult; after: MatchResult } {
  const afterMatch = matchTemplate(after, template);
  const variant = template.variants.find((v) => v.name === afterMatch.variantName)!;
  return { before: matchVariant(before, variant), after: afterMatch };
}

/**
 * 今のツモで土台を進められるか。
 * 「一致数が増え、かつ違反が増えない」設置が1つでもあれば true。
 * false の場合、評価エンジンは「逃がし」を肯定的に扱う。
 */
export function fitsCurrentPair(f: Field, template: FoundationTemplate, pair: Pair): boolean {
  for (const p of enumeratePlacements(f, pair)) {
    const out = applyPlacement(f, pair, p);
    if (!out) continue;
    const settled = resolveChains(out.field).field;
    const { before, after } = matchDelta(f, settled, template);
    if (
      after.matchedCount > before.matchedCount &&
      after.violationCells.length <= before.violationCells.length
    ) {
      return true;
    }
  }
  return false;
}
