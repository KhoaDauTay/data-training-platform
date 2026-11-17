/**
 * "Copy diagnostics" payload (telemetry phase 1, decision D6). Strict allowlist:
 * never SQL, error messages, stacks, drafts, save data or imported data.
 */
export type DiagnosticKind = 'db-init-failed' | 'db-timeout' | 'worker-crash' | 'chunk-load-failed' | 'js-error';
export type UaFamily = 'chrome' | 'firefox' | 'safari' | 'other';
export interface DiagnosticTimings { bootMs: number; seedMs: number; readyMs: number }

export interface Diagnostics {
  build: string;
  kind: DiagnosticKind;
  sqlstate?: string;
  errorName?: string;
  timings?: DiagnosticTimings;
  ua: UaFamily;
}

export interface DiagnosticsInput {
  build: string;
  kind: DiagnosticKind;
  error?: unknown;
  timings?: Partial<Record<keyof DiagnosticTimings, unknown>>;
  userAgent: string;
}

const SQLSTATE = /^[0-9A-Z]{5}$/;
const ERROR_NAME = /^[A-Za-z]{1,40}$/;
const BUILD = /^[0-9a-z]{1,40}$/;

export function uaFamily(ua: string): UaFamily {
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Chrome\/|Chromium\/|CriOS\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

function field(error: unknown, key: 'code' | 'name'): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const v = (error as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : undefined;
}

function ms(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined;
}

export function buildDiagnostics(input: DiagnosticsInput): Diagnostics {
  const d: Diagnostics = {
    build: BUILD.test(input.build) ? input.build : 'unknown',
    kind: input.kind,
    ua: uaFamily(input.userAgent),
  };
  const code = field(input.error, 'code');
  if (code !== undefined && SQLSTATE.test(code)) d.sqlstate = code;
  const name = field(input.error, 'name');
  if (name !== undefined && ERROR_NAME.test(name)) d.errorName = name;
  if (input.timings) {
    const bootMs = ms(input.timings.bootMs);
    const seedMs = ms(input.timings.seedMs);
    const readyMs = ms(input.timings.readyMs);
    if (bootMs !== undefined && seedMs !== undefined && readyMs !== undefined) d.timings = { bootMs, seedMs, readyMs };
  }
  return d;
}

/** Text the button copies to the clipboard. */
export function diagnosticsText(d: Diagnostics): string {
  return JSON.stringify(d, null, 2);
}
