// Skill drills (content/general/sql.yml) + parsers. Only src/content.ts imports this, with import(), so it is its own lazy
// chunk (Plan 8a D8a-12, budget `general`). The advanced nodes (adv.yml) are their own chunk since v19 (L167): generalAdvSources.ts.
export { default as sqlDrills } from '../content/general/sql.yml?raw';
export { buildGeneral } from './general'; // parsers ride in the same lazy chunk, never in main
