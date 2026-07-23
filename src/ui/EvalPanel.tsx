import type { MoveReview } from '../state/review';
import { CandidateCard } from './CandidateCard';

interface Props {
  review: MoveReview;
  /** placing 中に前の一手のレビューを見せている場合 true。 */
  stale: boolean;
}

/**
 * 一手の評価パネル。
 * 「正解」を示すのではなく、自分の一手を候補のひとつとして他の有力候補と並べて比較する。
 */
export function EvalPanel({ review, stale }: Props) {
  return (
    <div className="eval-panel" aria-live="polite">
      <h2 className="eval-heading">
        候補との比較
        {stale && <span className="eval-stale">(前の一手)</span>}
      </h2>
      <div className={`grade-badge grade-${review.grade}`}>
        <span className="grade-letter">{review.grade}</span>
        <span className="grade-label">{review.gradeLabel}</span>
      </div>
      {review.pairFitsTemplate === false && (
        <p className="eval-note">
          このツモは土台の形に合わない色でした。無理に使わず「逃がす」のが定石です。
        </p>
      )}
      <section>
        <h3 className="eval-subheading">あなたの一手</h3>
        <CandidateCard view={review.player} title="あなたの一手" open />
      </section>
      {review.candidates.length > 0 && (
        <section>
          <h3 className="eval-subheading">他の有力候補</h3>
          {review.candidates.map((c, i) => (
            <CandidateCard key={i} view={c} title={`候補${i + 1}`} />
          ))}
          <p className="eval-footnote">
            ぷよぷよの一手に正解はひとつではありません。それぞれのメリット・デメリットを見比べて、自分の方針に合う手を選べるようになるのが目標です。
          </p>
        </section>
      )}
    </div>
  );
}
