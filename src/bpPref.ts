/**
 * BP-LINT (L275) pref `cargo-query/bp-tips`, shared by Boon's tip (src/ui/bpTip.ts, chunk `bptip`) and the Best Practice page's
 * switches (src/ui/engineBest.ts, v24 BP-UI). Pure, no imports: both lazy chunks read it, main never does.
 */
export interface BpPref { off: boolean; mute: string[]; seen: string[]; fixed: number }
export const BP_TIPS_KEY = 'cargo-query/bp-tips';
const SEEN_MAX = 500;

/** Validated read (§5.6): broken data is dropped, never thrown; `seen` keeps the newest 500. */
export function parseBpTips(raw: string | null | undefined): BpPref {
  let v: Record<string, unknown> = {};
  try {
    const p: unknown = JSON.parse(raw ?? '{}');
    if (p && typeof p === 'object' && !Array.isArray(p)) v = p as Record<string, unknown>;
  } catch { /* empty pref */ }
  const strs = (x: unknown, re: RegExp): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && re.test(s)) : []);
  return {
    off: v.off === true,
    mute: strs(v.mute, /^[qa]\d\d$/),
    seen: strs(v.seen, /^[qa]\d\d@/).slice(-SEEN_MAX),
    fixed: Number.isInteger(v.fixed) && (v.fixed as number) > 0 ? v.fixed as number : 0,
  };
}

