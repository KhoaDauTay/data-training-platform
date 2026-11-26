// v47 P2/P6 (L926): "Fix the broken query" (content/general/fix.yml) and "Explain this query" (content/general/explain.yml).
// Only src/content.ts imports this, with import(), beside generalSources: its own lazy chunk (budget `practiceSets`).
// YAML only: the parsers ride in generalSources.ts (src/general.ts), like generalAdvSources.ts.
export { default as fixItems } from '../content/general/fix.yml';
export { default as explainItems } from '../content/general/explain.yml';
