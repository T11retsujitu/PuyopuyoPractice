import type { CandidateView } from '../state/review';
import { MiniBoard } from './MiniBoard';

interface Props {
  view: CandidateView;
  title: string;
  /** true なら解説を最初から開いた状態にする(あなたの一手用)。 */
  open?: boolean;
}

/** 候補手1つ分のカード: 縮小盤面 + 一言サマリ + 開閉式の詳細解説。 */
export function CandidateCard({ view, title, open }: Props) {
  const { candidate, reason, explanations } = view;
  const chains = candidate.chainResult.chains;
  const merits = explanations.filter((e) => e.type === 'merit');
  const demerits = explanations.filter((e) => e.type === 'demerit');
  return (
    <details className="candidate-card" open={open ?? false}>
      <summary>
        <div className="candidate-summary">
          <MiniBoard field={candidate.outcome.field} highlight={candidate.outcome.landed} rows={8} />
          <div className="candidate-text">
            <span className="candidate-title">{title}</span>
            <span className="candidate-reason">{reason}</span>
            {chains > 0 && <span className="candidate-chains">{chains}連鎖</span>}
          </div>
        </div>
      </summary>
      {(merits.length > 0 || demerits.length > 0) && (
        <ul className="explain-list">
          {merits.map((e, i) => (
            <li key={`m${i}`} className="explain-merit">
              ○ {e.text}
            </li>
          ))}
          {demerits.map((e, i) => (
            <li key={`d${i}`} className="explain-demerit">
              △ {e.text}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
