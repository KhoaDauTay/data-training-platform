// v47 D1/D2 (L930): domain case studies and asks (content/cases/cases.yml). Only src/content.ts imports this, with import(),
// so it is its own lazy chunk (budget `cases`), fetched by a domain Overview's "Tình huống" section or an interview-room load.
export { default as casesYml } from '../content/cases/cases.yml';
export { parseCases } from './cases';
