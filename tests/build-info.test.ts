import { expect, it } from 'vitest';

it('__BUILD__ is a short git sha in CI or "dev" locally', () => {
  expect(__BUILD__).toMatch(/^([0-9a-f]{7}|dev)$/);
});
