import type { PreferenceStorage } from './storage.ts';

export function browserStorage(): PreferenceStorage | null {
  try { return window.localStorage; } catch { return null; }
}
