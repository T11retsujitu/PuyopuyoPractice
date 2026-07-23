import type { CellPos, Color } from '../../core/types';

/** テンプレートの1セル。v は色変数(同じ文字 = 同じ色)。 */
export interface TemplateCell {
  pos: CellPos;
  v: string;
  /**
   * required: 土台の骨格。違反(別の色が入る)を数える対象。
   * suggested: 標準的な継続部分。一致すれば加点するが、違反は数えない。
   */
  kind: 'required' | 'suggested';
}

export interface TemplateVariant {
  name: string;
  nameJa: string;
  cells: TemplateCell[];
  /** 発火点。照合対象外(ここを正しい色で埋める = 発火)。 */
  triggerCells: CellPos[];
  /** 土台に合わないツモの捨て場として推奨する列(0-indexed)。 */
  dumpCols: number[];
}

export type FoundationFormId = 'stairs' | 'kagi' | 'gtr';

export interface FoundationTemplate {
  id: FoundationFormId;
  nameJa: string;
  descriptionJa: string;
  variants: TemplateVariant[];
}

export interface MatchResult {
  variantName: string;
  variantNameJa: string;
  /** 色変数 → 実際の色 の最良割り当て。 */
  assignment: ReadonlyMap<string, Color>;
  /** 割り当てどおりの色が入っているセル。 */
  matchedCells: CellPos[];
  /** required セルに別の色が入っているセル。 */
  violationCells: CellPos[];
  /** required セルのうち一致している数 / required 総数。 */
  requiredMatched: number;
  requiredTotal: number;
  /** 全テンプレセル(required + suggested)に対する一致数。 */
  matchedCount: number;
  /** 照合スコア = 一致数 − 2×違反数。バリアント間比較用。 */
  score: number;
}
