import type { SkillLevel } from '../profiles';

/**
 * 解説文のテンプレート集。
 * 練度別にトーンを変える: 初心者には「なぜそれが大事か」の理由を必ず添え、
 * 上級者には発火点・本線などの用語で簡潔に伝える。
 * 将来 AI 生成解説に差し替える場合はこのモジュールを置き換える。
 */

type Text = string | ((p: Record<string, string | number>) => string);

interface TextEntry {
  beginner: Text;
  intermediate?: Text;
  advanced?: Text;
}

export function renderText(entry: TextEntry, skill: SkillLevel, params: Record<string, string | number> = {}): string {
  const t = entry[skill] ?? entry.intermediate ?? entry.beginner;
  return typeof t === 'function' ? t(params) : t;
}

export const MERIT_TEXTS = {
  noChigiri: {
    beginner:
      'ちぎりのない置き方です。実戦ではちぎると落下待ちの時間が発生するので、ちぎらず置けると時間(テンポ)で有利になります。',
    intermediate: 'ちぎりなしで置けています。テンポを落とさない良い選択です。',
    advanced: 'ちぎりなし。手なりで形を進められています。',
  },
  conn2: {
    beginner: '置いたぷよが同色2連結になりました。同じ色を隣り合わせておくと、将来の連鎖の種になります。',
    intermediate: '同色2連結を作りました。連鎖パーツの種になります。',
    advanced: '2連結を確保。',
  },
  conn3: {
    beginner: '同色3連結ができました。あと1個くっつけると消せる、連鎖の一歩手前の形です。',
    intermediate: '3連結を確保しました。発火や連鎖パーツの候補が増えます。',
    advanced: '3連結を確保。発火候補が増えました。',
  },
  flat: {
    beginner: '盤面が平らに近づきました。平らだと次のツモをどこにでも置きやすく、選択肢が広がります。',
    intermediate: '盤面の凹凸を減らし、受け入れの広い形になりました。',
    advanced: '整地。ツモ受けが広がりました。',
  },
  chainExtend: {
    beginner: (p) =>
      p.before === 0
        ? `この一手で、新たに${p.after}連鎖が見込める形になりました。連鎖のタネが育ち始めています。`
        : `この一手で、想定できる連鎖が${p.before}連鎖から${p.after}連鎖に伸びました。少しずつ連鎖を大きく育てられています。`,
    intermediate: (p) =>
      p.before === 0
        ? `新たに${p.after}連鎖が見込める形になりました。`
        : `想定連鎖が${p.before}連鎖 → ${p.after}連鎖に伸びました。`,
    advanced: (p) => `本線が${p.after}連鎖に成長。`,
  },
  keepTrigger: {
    beginner: (p) =>
      `${p.col}列目に${p.color}${p.putPhrase}${p.chains}連鎖を打てる状態です。この「発火点」(連鎖の起点)が使えるままなのが良い形です。`,
    intermediate: (p) => `${p.col}列目の発火点が生きています(${p.color}${p.putPhrase}${p.chains}連鎖)。`,
    advanced: (p) => `発火点(${p.col}列目・${p.color})を温存。${p.chains}連鎖を発火できます。`,
  },
  templateFit: {
    beginner: (p) => `この置き方は${p.form}の形どおりです(+${p.n}マス)。お手本に沿って積めています。`,
    intermediate: (p) => `${p.form}の形に合致しています(+${p.n}マス)。`,
    advanced: (p) => `${p.form}を${p.n}マス前進。`,
  },
  escapeOk: {
    beginner:
      '今のツモは土台に使いにくい色です。形を崩して無理に使うより、脇へ逃がしておくのが良い判断です。逃がしたぷよも後で連鎖の一部にできることがあります。',
    intermediate: '土台に合わないツモを逃がしました。形を崩すより被害を小さく抑えられます。',
    advanced: '合わないツモの逃がし。妥当な処理です。',
  },
  dangerClear: {
    beginner: '3列目が高くて危険だったので、ここで消して高さを下げたのは的確です。窒息(3列目12段目が埋まると負け)を回避できました。',
    intermediate: '危険な高さだったため、消して立て直したのは的確な判断です。',
    advanced: '窒息回避の発火。妥当です。',
  },
  bigPop: {
    beginner: (p) => `${p.chains}連鎖を発火!育てた連鎖をきれいに消せました。`,
    intermediate: (p) => `${p.chains}連鎖を発火しました。`,
    advanced: (p) => `${p.chains}連鎖発火。`,
  },
  allClear: {
    beginner: '全消しです!盤面がリセットされ、また一から自由に連鎖を組めます。',
    intermediate: '全消し達成。次の展開を自由に組めます。',
    advanced: '全消し。',
  },
} satisfies Record<string, TextEntry>;

export const DEMERIT_TEXTS = {
  chigiri: {
    beginner: (p) =>
      `ちぎりが発生します(段差${p.d})。実戦では片方のぷよの落下を待つ時間が発生し、相手より積むのが遅くなります。`,
    intermediate: (p) => `${p.d}段のちぎりです。テンポが落ちるので、リターンに見合うか意識しましょう。`,
    advanced: (p) => `${p.d}段ちぎり。手損に見合うリターンがあるかは要検討です。`,
  },
  valley: {
    beginner: (p) =>
      `${p.col}列目が深い谷になっています。谷は縦置きでしか埋められないため、来るツモを選んでしまい苦しくなります。`,
    intermediate: (p) => `${p.col}列目が深い谷です。受け入れられるツモが狭くなります。`,
    advanced: (p) => `${p.col}列目に谷。ツモ受けが狭い形です。`,
  },
  buried: {
    beginner:
      '置いたぷよが同じ色の仲間とつながらないまま、上にぷよが乗って埋まりました。掘り出すまで使えない「死にぷよ」になりやすい形です。',
    intermediate: '孤立したぷよを埋めました。死にぷよになりやすく、連鎖効率が落ちます。',
    advanced: '孤立ぷよの埋没。ロスになります。',
  },
  triggerBlock: {
    beginner:
      '連鎖の発火点(連鎖を始める場所)まで、今はぷよを運べません。途中の列が12段目まで積み上がっているため、発火の前に周りを整理する手数がかかります。',
    intermediate: '発火点への経路が塞がっています。発火するには先に整地が必要です。',
    advanced: '発火ルートの封鎖。副砲がない盤面では致命的になり得ます。',
  },
  thirdHigh: {
    beginner: (p) =>
      `3列目が${p.h}段まで積み上がっています。3列目の12段目が埋まるとゲームオーバーなので、これ以上高くしないよう注意しましょう。`,
    intermediate: (p) => `3列目が${p.h}段です。窒息が近いので高さ管理を意識しましょう。`,
    advanced: (p) => `3列目${p.h}段。窒息圏です。`,
  },
  overGroup: {
    beginner: (p) =>
      `同じ色が${p.size}個まとまって消えました。4個ずつに区切って消すと、その分連鎖数を増やせます。`,
    intermediate: (p) => `${p.size}個の同時消しです。4個区切りにできれば連鎖数を稼げます。`,
    advanced: (p) => `${p.size}個消し。連結過多のロスです。`,
  },
  smallPop: {
    beginner: (p) =>
      `ここで${p.chains}連鎖を消してしまうのは少しもったいないです。消さずに育てれば${p.potential}連鎖が見込める盤面でした。小さく消すより、大きく育てて一度に消す方が強力です。`,
    intermediate: (p) => `${p.chains}連鎖の早消しです。育てれば${p.potential}連鎖が見込めました。`,
    advanced: (p) => `${p.chains}連鎖の早打ち。本線${p.potential}連鎖の価値と比較を。`,
  },
  templateBreak: {
    beginner: (p) =>
      `この置き方は${p.form}の形を崩します(${p.n}マスが予定と違う色)。お手本の形と見比べてみましょう。`,
    intermediate: (p) => `${p.form}の形を${p.n}マス崩しています。`,
    advanced: (p) => `${p.form}を${p.n}マス破壊。`,
  },
  chainShrink: {
    beginner: (p) =>
      p.after === 0
        ? `これまで見込めていた${p.before}連鎖の形が崩れました。連鎖のタネの上に別の色を乗せてしまったかもしれません。`
        : `想定できる連鎖が${p.before}連鎖から${p.after}連鎖に減りました。連鎖のタネの上に別の色を乗せてしまったかもしれません。`,
    intermediate: (p) =>
      p.after === 0
        ? `見込めていた${p.before}連鎖の形が崩れました。`
        : `想定連鎖が${p.before} → ${p.after}連鎖に減少しました。`,
    advanced: (p) => (p.after === 0 ? `本線が消失。` : `本線が${p.after}連鎖に縮小。`),
  },
  vanished: {
    beginner: 'ぷよが13段目からあふれて消滅しました。高く積みすぎです。',
    intermediate: '13段目あふれでぷよが消滅しました。',
    advanced: 'あふれで1個ロスト。',
  },
  dead: {
    beginner: 'この置き方は3列目の12段目を塞いでしまい、ゲームオーバーになります。',
    intermediate: 'この手は窒息します。',
    advanced: '窒息手です。',
  },
  missedTemplate: {
    beginner: 'このツモで土台を進められる置き方もありました。候補の盤面と見比べてみましょう。',
    intermediate: '土台を進められるツモでした。候補を参照してください。',
    advanced: '土台前進の手がありました。',
  },
} satisfies Record<string, TextEntry>;

export type MeritId = keyof typeof MERIT_TEXTS;
export type DemeritId = keyof typeof DEMERIT_TEXTS;
