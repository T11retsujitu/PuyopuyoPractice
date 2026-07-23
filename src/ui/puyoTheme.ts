import type { Color } from '../core/types';

export const PUYO_FILL: Record<Color, string> = {
  R: '#e0453f',
  G: '#48a943',
  B: '#4272dd',
  Y: '#d9a821',
  P: '#9350c9',
};

export const PUYO_STROKE: Record<Color, string> = {
  R: '#a52f2b',
  G: '#2f7a2c',
  B: '#2b4fa8',
  Y: '#a37b15',
  P: '#6a3596',
};

/** SVG 盤面の1マスの大きさ(viewBox 単位)。 */
export const CELL = 40;
