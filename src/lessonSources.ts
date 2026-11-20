// Quick lessons (content/lessons.yml, product-design-v4 §C) parsed at build time (V22-E). Only src/content.ts imports this, and only with
// import(), so it is its own lazy chunk (budget group `lessons`), fetched at boot beside the tickets: main is at its budget.
export { default as lessonSource } from '../content/lessons.yml';
