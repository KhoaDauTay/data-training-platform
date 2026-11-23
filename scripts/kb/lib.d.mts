export interface Chapter { order: number; title: string; url: string; note?: string; outline?: string[]; hash?: string; seen?: string; error?: string }
export interface Section { section: string; chapters: Chapter[] }
export interface Tutorial { slug: string; title: string; index: string; chapters: number; sections: Section[] }
export interface RobotsRule { allow: boolean; path: string }
export interface Diff {
  newTutorials: { slug: string; title: string }[];
  removedTutorials: { slug: string; title: string }[];
  added: { slug: string; url: string; title: string; section: string }[];
  removed: { slug: string; url: string; title: string; section: string }[];
  renamed: { slug: string; url: string; from: string; to: string }[];
  moved: { slug: string; url: string; title: string; from: string; to: string }[];
  changed: { slug: string; url: string; title: string; headingsAdded: string[]; headingsRemoved: string[] }[];
}
export const BASE: string;
export function dec(s: string): string;
export function parseIndex(html: string): string[];
export function parseToc(html: string, slug: string): { title: string; sections: Section[] };
export function parseOutline(html: string): { outline: string[]; hash: string } | null;
export function robotsRules(txt: string, agent: string): RobotsRule[];
export function robotsAllows(rules: RobotsRule[], url: string): boolean;
export function diffRoutes(prev: Tutorial[], next: Tutorial[], scope?: string[]): Diff;
export function changesMd(d: Diff, o: { date: string; prevDate?: string; scope: string[]; failures?: { url: string; status: string }[] }): string;
export function daysBetween(a: string, b: string): number;
