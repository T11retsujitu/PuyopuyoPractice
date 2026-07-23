/** mulberry32: 軽量・決定的な32bit PRNG。シードが同じなら列も同じ。 */
export class SeededRng {
  private state: number;

  constructor(readonly seed: number) {
    this.state = seed >>> 0;
  }

  /** [0, 1) の乱数。 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [0, n) の整数乱数。 */
  nextInt(n: number): number {
    return Math.floor(this.next() * n);
  }
}
