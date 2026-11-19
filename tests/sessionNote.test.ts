import { describe, expect, it } from 'vitest';
import { parseSessionNote, sessionNote } from '../src/session';
import type { Ticket } from '../src/tickets';

describe('session note (a reload keeps the Sandbox or a lane task)', () => {
  it('notes only the Sandbox and lane tasks', () => {
    expect(sessionNote({ kind: 'sandbox' }, 'finance')).toEqual({ kind: 'sandbox', domain: 'finance' });
    expect(sessionNote({ kind: 'lane', ticket: { id: 'lane-sgsin-01' } as Ticket }, 'logistics')).toEqual({ kind: 'lane', domain: 'logistics', id: 'lane-sgsin-01' });
    expect(sessionNote({ kind: 'story' }, 'logistics')).toBeNull();
  });
  it('reads back what it wrote and drops anything else', () => {
    expect(parseSessionNote({ kind: 'sandbox', domain: 'ecommerce' })).toEqual({ kind: 'sandbox', domain: 'ecommerce' });
    expect(parseSessionNote({ kind: 'lane', domain: 'logistics', id: 'x' })).toEqual({ kind: 'lane', domain: 'logistics', id: 'x' });
    for (const bad of [null, 'sandbox', 1, {}, { kind: 'lane', domain: 'logistics' }, { kind: 'practice', domain: 'logistics' }, { kind: 'sandbox' }]) expect(parseSessionNote(bad)).toBeNull();
  });
});
