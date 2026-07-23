import { describe, expect, it } from 'vitest';
import { DECK_PAIRS, createTsumoDeck } from './tsumo';
import type { Color } from './types';

describe('createTsumoDeck', () => {
  it('same seed reproduces the same sequence', () => {
    const a = createTsumoDeck(42);
    const b = createTsumoDeck(42);
    for (let i = 0; i < DECK_PAIRS; i++) {
      expect(a.pairAt(i)).toEqual(b.pairAt(i));
    }
  });

  it('different seeds differ somewhere', () => {
    const a = createTsumoDeck(1);
    const b = createTsumoDeck(2);
    const same = Array.from({ length: DECK_PAIRS }, (_, i) => i).every(
      (i) => a.pairAt(i).axis === b.pairAt(i).axis && a.pairAt(i).child === b.pairAt(i).child,
    );
    expect(same).toBe(false);
  });

  it('loops after 128 pairs', () => {
    const deck = createTsumoDeck(7);
    expect(deck.pairAt(DECK_PAIRS)).toEqual(deck.pairAt(0));
    expect(deck.pairAt(DECK_PAIRS + 5)).toEqual(deck.pairAt(5));
  });

  it('pool is color-equal: 64 of each color', () => {
    const deck = createTsumoDeck(99);
    const counts = new Map<Color, number>();
    for (let i = 0; i < DECK_PAIRS; i++) {
      const { axis, child } = deck.pairAt(i);
      counts.set(axis, (counts.get(axis) ?? 0) + 1);
      counts.set(child, (counts.get(child) ?? 0) + 1);
    }
    expect([...counts.values()]).toEqual([64, 64, 64, 64].map(() => 64));
    expect(counts.size).toBe(4);
  });

  it('first 2 pairs never contain a 4th color (500 seeds)', () => {
    for (let seed = 0; seed < 500; seed++) {
      const deck = createTsumoDeck(seed);
      const colors = new Set<Color>();
      for (let i = 0; i < 2; i++) {
        colors.add(deck.pairAt(i).axis);
        colors.add(deck.pairAt(i).child);
      }
      expect(colors.size).toBeLessThanOrEqual(3);
    }
  });
});
