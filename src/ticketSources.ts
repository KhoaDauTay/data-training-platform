// Every ticket file as raw markdown. Only src/content.ts imports this, and only with import(), so it is its own lazy chunk.
export const sources = import.meta.glob<string>('../content/tickets/**/*.md', { query: '?raw', import: 'default', eager: true });
