import { useMemo } from 'react';
import type { Field, Pair, Placement } from '../core/types';
import { applyPlacement } from '../core/placement';
import { CELL, PUYO_FILL, PUYO_STROKE } from './puyoTheme';
import { cellCenter } from './BoardView';

interface Props {
  field: Field;
  pair: Pair;
  placement: Placement;
}

/**
 * ホバー中のツモ(ヘッダー領域)と着地予告を描く。
 * 置けない位置では赤い表示になる。BoardView の children として使う。
 */
export function GhostOverlay({ field, pair, placement }: Props) {
  const outcome = useMemo(() => applyPlacement(field, pair, placement), [field, pair, placement]);

  // ヘッダー領域内のホバー表示位置(視覚専用)。
  const axisX = placement.col * CELL + CELL / 2;
  const lowerY = CELL + CELL / 2;
  const upperY = CELL / 2;
  let axisY = lowerY;
  let childX = axisX;
  let childY = upperY;
  if (placement.rot === 1) {
    childX = axisX + CELL;
    childY = lowerY;
  } else if (placement.rot === 3) {
    childX = axisX - CELL;
    childY = lowerY;
  } else if (placement.rot === 2) {
    axisY = upperY;
    childY = lowerY;
  }

  const illegal = outcome === null;

  return (
    <g>
      <g opacity={illegal ? 0.45 : 0.9}>
        <circle
          cx={axisX}
          cy={axisY}
          r={CELL / 2 - 5}
          fill={illegal ? '#7a3030' : PUYO_FILL[pair.axis]}
          stroke={illegal ? '#a04040' : PUYO_STROKE[pair.axis]}
          strokeWidth={2}
        />
        {/* 軸ぷよの印 */}
        <circle cx={axisX} cy={axisY} r={5} fill="#ffffff" opacity={0.85} />
        <circle
          cx={childX}
          cy={childY}
          r={CELL / 2 - 5}
          fill={illegal ? '#7a3030' : PUYO_FILL[pair.child]}
          stroke={illegal ? '#a04040' : PUYO_STROKE[pair.child]}
          strokeWidth={2}
        />
      </g>
      {outcome &&
        outcome.landed.map((p, i) => {
          const { x, y } = cellCenter(p);
          const color = outcome.field[p.col]?.[p.row];
          if (!color) return null;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={CELL / 2 - 6}
              fill="none"
              stroke={PUYO_FILL[color]}
              strokeWidth={3}
              strokeDasharray="5 4"
              opacity={0.9}
            />
          );
        })}
      {illegal && (
        <text x={120} y={CELL * 2 + 18} textAnchor="middle" fontSize={13} fill="#ff9c9c">
          12段目が塞がっていて、ここへは運べません
        </text>
      )}
    </g>
  );
}
