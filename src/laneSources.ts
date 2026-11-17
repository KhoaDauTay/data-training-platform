// Lane briefs and side tasks (content/lanes/) as raw text. Only src/content.ts imports this, and only with import(),
// so it is its own lazy chunk (budget group `lanes`, Plan 5), fetched at boot beside the ticket chunk.
export const laneSources = import.meta.glob<string>('../content/lanes/*/*.md', { query: '?raw', import: 'default', eager: true });
export { default as briefSource } from '../content/lanes/lanes.yml?raw';
