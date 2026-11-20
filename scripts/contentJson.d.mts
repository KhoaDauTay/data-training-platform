import type { Plugin } from 'vite';

export function yamlData(text: string): unknown;
export function mdData(text: string): { fm: unknown; body: string } | null;
export function contentJson(): Plugin;
export function metaData(text: string, keys: string[]): { fm: Record<string, unknown> } | null;
