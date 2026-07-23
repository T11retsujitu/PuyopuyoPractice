import type { Pair } from '../core/types';
import { PUYO_FILL, PUYO_STROKE } from './puyoTheme';

interface Props {
  next: Pair;
  nextNext: Pair;
}

function PairView({ pair, size }: { pair: Pair; size: number }) {
  const r = size / 2 - 2;
  return (
    <svg viewBox={`0 0 ${size} ${size * 2}`} style={{ width: size, height: size * 2 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill={PUYO_FILL[pair.child]} stroke={PUYO_STROKE[pair.child]} strokeWidth={1.5} />
      <circle cx={size / 2} cy={size + size / 2} r={r} fill={PUYO_FILL[pair.axis]} stroke={PUYO_STROKE[pair.axis]} strokeWidth={1.5} />
    </svg>
  );
}

/** ネクスト・ネクネクの表示。上が子ぷよ・下が軸ぷよ。 */
export function NextPreview({ next, nextNext }: Props) {
  return (
    <div className="next-preview" aria-label="次のツモ">
      <div className="next-slot">
        <span className="next-label">ネクスト</span>
        <PairView pair={next} size={30} />
      </div>
      <div className="next-slot">
        <span className="next-label">その次</span>
        <PairView pair={nextNext} size={22} />
      </div>
    </div>
  );
}
