// v19 V19-C (L167): the advanced DA track (content/general/adv.yml), split off the `general` chunk (budget `generalAdv`).
// Only src/content.ts imports this, with import(); text only, its parser rides in generalSources.ts.
export { default as advNodes } from '../content/general/adv.yml';
