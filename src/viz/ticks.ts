/**
 * ui-ux-v7 C1: about `n` axis ticks at "nice" steps (1, 2, 5 × 10^k) covering [min, max], both ends included.
 * 0..17034 → 0, 5000, 10000, 15000, 20000. A single value gets a step around it; NaN/Infinity give no ticks.
 */
export function niceTicks(min: number, max: number, n = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min > max) [min, max] = [max, min];
  if (min === max) {
    if (min === 0) return [0, 1];
    const d = Math.abs(min) / 2;
    [min, max] = [min - d, max + d];
  }
  const raw = (max - min) / Math.max(1, n - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((m) => m * mag >= raw - 1e-12) ?? 10) * mag;
  const lo = Math.floor(min / step + 1e-9);
  const hi = Math.ceil(max / step - 1e-9);
  const out: number[] = [];
  for (let k = lo; k <= hi; k++) out.push(Number((k * step).toPrecision(12)) || 0); // k × step, never a running sum (float drift); || 0: no -0
  return out;
}
