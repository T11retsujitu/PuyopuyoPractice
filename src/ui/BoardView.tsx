import type { ReactNode } from 'react';
import type { CellPos, Color, Field } from '../core/types';
import { COLS, DEATH_CELL, TOTAL_ROWS, VISIBLE_ROWS } from '../core/types';
import { CELL, PUYO_FILL, PUYO_STROKE } from './puyoTheme';

/** 盤面の上に確保する、ホバー中ツモ表示用の余白(2段)。 */
export const HEADER_ROWS = 2;

/** 盤面上のセル位置 → SVG 座標(中心)。 */
export function cellCenter(pos: CellPos): { x: number; y: number } {
  return {
    x: pos.col * CELL + CELL / 2,
    y: (TOTAL_ROWS - 1 - pos.row + HEADER_ROWS) * CELL + CELL / 2,
  };
}

export interface BoardOverlayCell {
  pos: CellPos;
  color: Color;
  /** 'ghost' = お手本の半透明表示, 'preview' = 着地予告の輪郭。 */
  style: 'ghost' | 'preview';
}

interface Props {
  field: Field;
  /** 消去アニメーション中の点滅セル。 */
  flashing?: CellPos[];
  overlay?: BoardOverlayCell[];
  /** 直前に置かれたセルの強調。 */
  highlight?: CellPos[];
  children?: ReactNode;
}

const W = COLS * CELL;
const H = (TOTAL_ROWS + HEADER_ROWS) * CELL;
const FIELD_TOP = HEADER_ROWS * CELL;

export function BoardView({ field, flashing, overlay, highlight, children }: Props) {
  const flashSet = new Set((flashing ?? []).map((p) => `${p.col},${p.row}`));
  const highlightSet = new Set((highlight ?? []).map((p) => `${p.col},${p.row}`));

  const joints: ReactNode[] = [];
  const puyos: ReactNode[] = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < TOTAL_ROWS; row++) {
      const color = field[col]?.[row];
      if (!color) continue;
      const { x, y } = cellCenter({ col, row });
      const isGhostRow = row >= VISIBLE_ROWS;
      const flash = flashSet.has(`${col},${row}`);
      // 連結ジョイント(右・上のみ描けば全対を網羅)。幽霊段は連結しない。
      if (!isGhostRow) {
        for (const [dc, dr] of [
          [1, 0],
          [0, 1],
        ] as const) {
          const nc = col + dc;
          const nr = row + dr;
          if (nr >= VISIBLE_ROWS) continue;
          if (field[nc]?.[nr] === color) {
            const n = cellCenter({ col: nc, row: nr });
            joints.push(
              <rect
                key={`j${col},${row},${dc},${dr}`}
                x={Math.min(x, n.x) - 9}
                y={Math.min(y, n.y) - 9}
                width={Math.abs(n.x - x) + 18}
                height={Math.abs(n.y - y) + 18}
                rx={9}
                fill={PUYO_FILL[color]}
                opacity={isGhostRow ? 0.35 : 1}
              />,
            );
          }
        }
      }
      puyos.push(
        <circle
          key={`p${col},${row}`}
          cx={x}
          cy={y}
          r={CELL / 2 - 4}
          fill={PUYO_FILL[color]}
          stroke={PUYO_STROKE[color]}
          strokeWidth={2}
          opacity={isGhostRow ? 0.35 : 1}
          className={flash ? 'puyo-flash' : highlightSet.has(`${col},${row}`) ? 'puyo-highlight' : undefined}
        />,
      );
    }
  }

  const deathCenter = cellCenter(DEATH_CELL);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="board-svg"
      role="img"
      aria-label="ぷよぷよの盤面"
    >
      {/* ホバー用ヘッダー領域 */}
      <rect x={0} y={0} width={W} height={FIELD_TOP} fill="#0e1118" rx={6} />
      <rect x={0} y={FIELD_TOP} width={W} height={H - FIELD_TOP} fill="#1e2430" rx={6} />
      {/* 幽霊段(13段目)の背景と区切り線 */}
      <rect x={0} y={FIELD_TOP} width={W} height={CELL} fill="#141822" />
      <line
        x1={0}
        y1={FIELD_TOP + CELL}
        x2={W}
        y2={FIELD_TOP + CELL}
        stroke="#4a566b"
        strokeDasharray="6 4"
      />
      {/* マス目 */}
      {Array.from({ length: COLS - 1 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={(i + 1) * CELL}
          y1={FIELD_TOP}
          x2={(i + 1) * CELL}
          y2={H}
          stroke="#2a3242"
        />
      ))}
      {Array.from({ length: TOTAL_ROWS - 1 }, (_, i) => (
        <line
          key={`h${i}`}
          x1={0}
          y1={FIELD_TOP + (i + 1) * CELL}
          x2={W}
          y2={FIELD_TOP + (i + 1) * CELL}
          stroke="#2a3242"
        />
      ))}
      {/* 窒息点マーク */}
      <g opacity={0.6} stroke="#8a94a8" strokeWidth={3} strokeLinecap="round">
        <line
          x1={deathCenter.x - 10}
          y1={deathCenter.y - 10}
          x2={deathCenter.x + 10}
          y2={deathCenter.y + 10}
        />
        <line
          x1={deathCenter.x - 10}
          y1={deathCenter.y + 10}
          x2={deathCenter.x + 10}
          y2={deathCenter.y - 10}
        />
      </g>
      {joints}
      {puyos}
      {(overlay ?? []).map((o, i) => {
        const { x, y } = cellCenter(o.pos);
        return o.style === 'ghost' ? (
          <circle
            key={`o${i}`}
            cx={x}
            cy={y}
            r={CELL / 2 - 10}
            fill={PUYO_FILL[o.color]}
            opacity={0.35}
          />
        ) : (
          <circle
            key={`o${i}`}
            cx={x}
            cy={y}
            r={CELL / 2 - 5}
            fill="none"
            stroke={PUYO_FILL[o.color]}
            strokeWidth={3}
            strokeDasharray="5 4"
          />
        );
      })}
      {children}
    </svg>
  );
}
