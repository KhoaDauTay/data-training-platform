// Types for scripts/overlap-check.mjs (imported by tests/figures.test.ts).
export interface OverlapText { k?: string; s: string; x: number; y: number; w: number; h: number; size: number; px: number; owner?: string }
export interface OverlapBox { k?: string; kind: string; x: number; y: number; w: number; h: number; parent?: string; ok?: boolean; sw?: number }
export interface OverlapArrow { k?: string; pts: [number, number][]; tip: [number, number]; from?: string; to?: string }
export interface OverlapFrame {
  vb: [number, number, number, number]; texts: OverlapText[]; boxes: OverlapBox[]; arrows: OverlapArrow[];
  page?: { overflow: string[] }; fig?: boolean;
}
export interface Finding { t: string; sev: string; what: string }
export const RULES: { textGap: number; boxGap: number; tipMin: number; minPx: Record<number, number>; figPx: number; inkShrink: number; seeGap: number; clear: number };
export function samplePath(d: string, step?: number): [number, number][];
export function analyze(f: OverlapFrame, width: number): Finding[];
