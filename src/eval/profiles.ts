export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export const SKILL_LEVELS: { id: SkillLevel; nameJa: string; descriptionJa: string }[] = [
  {
    id: 'beginner',
    nameJa: '初心者',
    descriptionJa: '平らに積む・同色をつなげる・ちぎらない、の基本を重視します。',
  },
  {
    id: 'intermediate',
    nameJa: '中級者',
    descriptionJa: '連鎖のポテンシャルを最重視。発火点の確保や連鎖の伸ばし方を学びます。',
  },
  {
    id: 'advanced',
    nameJa: '上級者',
    descriptionJa: '発火点の柔軟性・効率を含めて評価。連鎖のためのちぎりは許容されます。',
  },
];

/** 特徴量ごとの重み。score = Σ weight × feature。 */
export interface WeightProfile {
  chigiriPerStep: number;
  bumpinessOver6: number;
  deepValley: number;
  edgeValley: number;
  deadRisk: number;
  conn2: number;
  conn3: number;
  overGroupCell: number;
  buriedIsolated: number;
  maxChainPer: number;
  ignitionFlexPer: number;
  triggerBlocked: number;
  triggerNeeds2: number;
  /** 安全時(3列目 h<10)に1〜2連鎖を消してしまう。 */
  smallPopSafe: number;
  /** 危険時(3列目 h>=10)に消して高さを下げる。 */
  popInDanger: number;
  vanishedPer: number;
  templateMatchPerCell: number;
  templateViolationPerCell: number;
  /** 逃がし置き(土台に合わないツモを被害最小で処理)への加点。 */
  templateEscape: number;
}

export const WEIGHT_PROFILES: Record<SkillLevel, WeightProfile> = {
  beginner: {
    chigiriPerStep: -6,
    bumpinessOver6: -1.5,
    deepValley: -8,
    edgeValley: -4,
    deadRisk: -3,
    conn2: 2,
    conn3: 5,
    overGroupCell: -1,
    buriedIsolated: -6,
    maxChainPer: 3,
    ignitionFlexPer: 0,
    triggerBlocked: 0,
    triggerNeeds2: 0,
    smallPopSafe: -2,
    popInDanger: 8,
    vanishedPer: -8,
    templateMatchPerCell: 8,
    templateViolationPerCell: -10,
    templateEscape: 6,
  },
  intermediate: {
    chigiriPerStep: -3,
    bumpinessOver6: -0.8,
    deepValley: -5,
    edgeValley: -2,
    deadRisk: -3,
    conn2: 1.5,
    conn3: 4,
    overGroupCell: -3,
    buriedIsolated: -5,
    maxChainPer: 7,
    ignitionFlexPer: 2,
    triggerBlocked: -6,
    triggerNeeds2: -1,
    smallPopSafe: -6,
    popInDanger: 10,
    vanishedPer: -8,
    templateMatchPerCell: 6,
    templateViolationPerCell: -8,
    templateEscape: 5,
  },
  advanced: {
    chigiriPerStep: -1.5,
    bumpinessOver6: -0.4,
    deepValley: -3,
    edgeValley: -1,
    deadRisk: -3,
    conn2: 1,
    conn3: 3,
    overGroupCell: -4,
    buriedIsolated: -4,
    maxChainPer: 9,
    ignitionFlexPer: 3,
    triggerBlocked: -10,
    triggerNeeds2: -2,
    smallPopSafe: -10,
    popInDanger: 12,
    vanishedPer: -8,
    templateMatchPerCell: 5,
    templateViolationPerCell: -6,
    templateEscape: 5,
  },
};
