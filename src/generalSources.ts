// Drills and advanced nodes (content/general/*.yml). Only src/content.ts imports this, with import(), so it is its own lazy chunk (Plan 8a D8a-12).
export { default as sqlDrills } from '../content/general/sql.yml?raw';
export { default as advNodes } from '../content/general/adv.yml?raw';
