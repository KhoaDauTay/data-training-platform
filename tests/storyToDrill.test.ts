// @vitest-environment jsdom
// v21 E5: from a story task, a drill hash opens the drill once its chunk and `lab` are in. Meanwhile the story's editor takes no
// keys (#work is inert), so nothing typed lands in the story draft; the drill opens with its pane usable again.
// v21 E4: the completion dock is a labelled region, so its sentence is inside a landmark.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { session } from '../src/session';
import { boot, byId, EmptyWorker, visit } from './axeHarness';

beforeAll(async () => {
  await boot({ worker: EmptyWorker, storage: { 'cargo-query/coach-done': 'true', 'cargo-query/tour': JSON.stringify({ step: 99, knows: true }) } });
  await visit('#/d/logistics/play');
});

describe('story → drill hash', () => {
  it('#work is inert while the drill loads, usable once it is open', async () => {
    expect(session.mode.kind).toBe('story');
    location.hash = '#/learn/play/g-where-1';
    await vi.waitFor(() => expect(byId('work').hasAttribute('inert')).toBe(true), { timeout: 2000, interval: 5 });
    await vi.waitFor(() => expect(session.mode.kind).toBe('drill'), { timeout: 10_000, interval: 50 });
    await vi.waitFor(() => expect(byId('work').hasAttribute('inert')).toBe(false), { timeout: 5000, interval: 50 });
  });
});

describe('completion dock', () => {
  it('is a labelled region (axe `region`: #stage-text inside a landmark)', () => {
    const stage = byId('stage');
    expect(stage.getAttribute('role')).toBe('region');
    expect(stage.getAttribute('aria-label')).toBeTruthy();
    expect(stage.contains(byId('stage-text'))).toBe(true);
  });
});
