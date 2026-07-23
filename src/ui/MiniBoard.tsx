import type { CellPos, Field } from '../core/types';
import { COLS, TOTAL_ROWS, VISIBLE_ROWS } from '../core/types';
import { PUYO_FILL } from './puyoTheme';

interface Props {
  field: Field;
  highlight?: CellPos[];
  /** 表示する段数(下から)。候補プレビューは下8段で十分なことが多い。 */
  rows?: number;
}

const MINI = 14;

/** 候補手プレビュー用の縮小盤面。 */
export function MiniBoard({ field, highlight, rows }: Props) {
  const shown = Math.min(TOTAL_ROWS, Math.max(rows ?? VISIBLE_ROWS, neededRows(field, highlight)));
  const w = COLS * MINI;
  const h = shown * MINI;
  const hi = new Set((highlight ?? []).map((p) => `${p.col},${p.row}`));
  const cells = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < shown; row++) {
      const color = field[col]?.[row];
      if (!color) continue;
      cells.push(
        <circle
          key={`${col},${row}`}
          cx={col * MINI + MINI / 2}
          cy={h - row * MINI - MINI / 2}
          r={MINI / 2 - 1.5}
          fill={PUYO_FILL[color]}
          stroke={hi.has(`${col},${row}`) ? '#ffffff' : 'none'}
          strokeWidth={hi.has(`${col},${row}`) ? 2 : 0}
        />,
      );
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mini-board" style={{ width: w, height: h }}>
      <rect x={0} y={0} width={w} height={h} fill="#1e2430" rx={4} />
      {cells}
    </svg>
  );
}

function neededRows(field: Field, highlight?: CellPos[]): number {
  let top = 5; // 最低でも下5段は見せる
  for (let col = 0; col < COLS; col++) {
    for (let row = TOTAL_ROWS - 1; row >= 0; row--) {
      if (field[col]?.[row]) {
        top = Math.max(top, row + 1);
        break;
      }
    }
  }
  for (const p of highlight ?? []) top = Math.max(top, p.row + 1);
  return top;
}
