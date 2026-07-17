/**
 * Utility for clamping a value to a numeric range.
 *
 * Returns `fallback` when the input is not a finite number, otherwise clamps it
 * to `[min, max]`. The `value` parameter is typed as `unknown` so callers can pass
 * raw deserialized data without an extra guard.
 */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
