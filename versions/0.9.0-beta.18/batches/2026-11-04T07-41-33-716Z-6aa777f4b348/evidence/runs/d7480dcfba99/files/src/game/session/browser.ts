import { MAX_SEED } from '../boardCode.ts';
import type { Size } from '../boardCode.ts';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';
import type { PreferenceStorage } from './storage.ts';

export function browserStorage(): PreferenceStorage | null {
  try { return window.localStorage; } catch { return null; }
}
export function freshGame(size: Size, previousCode?: string): GameState {
  let seed = Math.floor(Math.random() * MAX_SEED) + 1;
  if (`np1-${size}-${seed}` === previousCode) seed = seed % MAX_SEED + 1;
  const state = createGame(`np1-${size}-${seed}`);
  if (!state) throw new Error('Unable to create deal');
  return state;
}
