import type { MatchResult } from '../eval/templates';
import type { MoveFeatures } from '../eval/features';

interface Props {
  match: MatchResult;
  formName: string;
  /** 直前の一手のテンプレ差分(あれば合致/崩しの一言を出す)。 */
  lastTemplate: MoveFeatures['template'] | undefined;
  showGuide: boolean;
  onToggleGuide: (v: boolean) => void;
}

/** 土台練習モードの完成度表示。 */
export function TemplateProgress({ match, formName, lastTemplate, showGuide, onToggleGuide }: Props) {
  const pct = match.requiredTotal === 0 ? 0 : Math.round((match.requiredMatched / match.requiredTotal) * 100);
  let verdict: { text: string; kind: 'good' | 'bad' | 'neutral' } | null = null;
  if (lastTemplate) {
    if (lastTemplate.violationDelta > 0) verdict = { text: `${formName}の形を崩しました`, kind: 'bad' };
    else if (lastTemplate.matchedDelta > 0) verdict = { text: `${formName}の形に合致!`, kind: 'good' };
    else if (lastTemplate.escape) verdict = { text: '合わないツモを逃がしました', kind: 'neutral' };
    else verdict = { text: '土台には中立の一手', kind: 'neutral' };
  }
  return (
    <div className="template-progress">
      <h3 className="side-heading">{formName}の完成度</h3>
      <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="progress-note">
        骨格 {match.requiredMatched}/{match.requiredTotal} マス
        {match.violationCells.length > 0 && (
          <span className="progress-violation">(違反 {match.violationCells.length} マス)</span>
        )}
      </p>
      <p className="progress-variant">お手本: {match.variantNameJa}</p>
      {verdict && <p className={`progress-verdict verdict-${verdict.kind}`}>{verdict.text}</p>}
      <label className="guide-toggle">
        <input type="checkbox" checked={showGuide} onChange={(e) => onToggleGuide(e.target.checked)} />
        お手本を盤面に重ねて表示
      </label>
    </div>
  );
}
