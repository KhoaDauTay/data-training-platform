import { describe, expect, it } from 'vitest';
import { voiceKey } from '../src/ui/feedback';

describe('voiceKey (v11 B2)', () => {
  const rows = (missing: number, extra: number) => ({ ok: false, reason: 'rows', missing, extra }) as Parameters<typeof voiceKey>[0];
  it('same count, wrong values: values; different counts both ways: rows and values', () => {
    expect(voiceKey(rows(3, 3))).toBe('voice.values');
    expect(voiceKey(rows(9, 22))).toBe('voice.rowsAndValues');
    expect(voiceKey(rows(2, 0))).toBe('voice.missing');
    expect(voiceKey(rows(0, 2))).toBe('voice.extra');
  });
});
