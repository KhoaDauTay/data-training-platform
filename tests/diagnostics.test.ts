import { describe, expect, it } from 'vitest';
import { buildDiagnostics, diagnosticsText, uaFamily } from '../src/diagnostics';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const EDGE = `${CHROME} Edg/131.0.0.0`;
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';
const SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';

describe('uaFamily', () => {
  it('maps user agents to 4 coarse families', () => {
    expect(uaFamily(CHROME)).toBe('chrome');
    expect(uaFamily(EDGE)).toBe('chrome');
    expect(uaFamily(FIREFOX)).toBe('firefox');
    expect(uaFamily(SAFARI)).toBe('safari');
    expect(uaFamily('curl/8.5.0')).toBe('other');
  });
});

describe('buildDiagnostics', () => {
  it('keeps only allowlisted fields and never leaks SQL, message or stack', () => {
    const err = Object.assign(new Error('invalid input syntax for type integer: "SECRET-VALUE"'), {
      code: '22P02',
      query: "SELECT * FROM customers WHERE name = 'SECRET-VALUE'",
    });
    const d = buildDiagnostics({
      build: 'abc1234',
      kind: 'db-init-failed',
      error: err,
      timings: { bootMs: 812.4, seedMs: 2034.6, readyMs: 3001 },
      userAgent: CHROME,
    });
    expect(d).toEqual({
      build: 'abc1234',
      kind: 'db-init-failed',
      sqlstate: '22P02',
      errorName: 'Error',
      timings: { bootMs: 812, seedMs: 2035, readyMs: 3001 },
      ua: 'chrome',
    });
    const text = diagnosticsText(d);
    expect(text).not.toContain('SECRET-VALUE');
    expect(text).not.toContain('SELECT');
    expect(text).not.toContain('diagnostics.test');
  });

  it('drops values that do not match the allowlist shape', () => {
    const d = buildDiagnostics({
      build: "x'); DROP TABLE t;--",
      kind: 'js-error',
      error: { code: 'not a sqlstate', name: 'Name with spaces and "quotes"' },
      timings: { bootMs: 'fast', seedMs: Number.NaN, readyMs: -1 },
      userAgent: FIREFOX,
    });
    expect(d).toEqual({ build: 'unknown', kind: 'js-error', ua: 'firefox' });
  });

  it('accepts non-object errors and missing timings', () => {
    expect(buildDiagnostics({ build: 'dev', kind: 'db-timeout', error: 'boom', userAgent: SAFARI }))
      .toEqual({ build: 'dev', kind: 'db-timeout', ua: 'safari' });
  });
});
