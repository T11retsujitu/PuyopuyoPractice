import { describe, expect, it } from 'vitest';
import { COLS, TOTAL_ROWS, VISIBLE_ROWS } from './types';

describe('constants', () => {
  it('field dimensions follow Puyo Puyo Tsu rules', () => {
    expect(COLS).toBe(6);
    expect(VISIBLE_ROWS).toBe(12);
    expect(TOTAL_ROWS).toBe(13);
  });
});
