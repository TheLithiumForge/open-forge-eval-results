import { MAX_SEED } from '../board.ts';
import type { GameState } from '../state.ts';
import type { StorageAccess } from './storage.ts';

export interface SessionAnnouncement {
  readonly serial: number;
  readonly text: string;
}

export interface SessionView {
  readonly game: GameState;
  readonly dealId: number;
  readonly paused: boolean;
  readonly best: number | null;
  readonly celebrating: boolean;
  readonly status: string;
  readonly announcement: SessionAnnouncement;
}

export interface SessionEnvironment {
  now(): number;
  setInterval(callback: () => void, milliseconds: number): () => void;
  setTimeout(callback: () => void, milliseconds: number): () => void;
  isVisible(): boolean;
  onVisibilityChange(callback: () => void): () => void;
  readonly storage: StorageAccess | null;
  randomSeed(): number;
}

export function validSeed(environment: SessionEnvironment): number {
  const candidate = environment.randomSeed();
  return Number.isSafeInteger(candidate) && candidate >= 1 && candidate <= MAX_SEED ? candidate : 1;
}

export function makeBrowserEnvironment(): SessionEnvironment {
  let storage: StorageAccess | null = null;
  try { storage = globalThis.localStorage; } catch {
    // Storage may be disabled by the browser.
  }
  return {
    now: () => performance.now(),
    setInterval: (callback, milliseconds) => {
      const id = globalThis.setInterval(callback, milliseconds);
      return () => globalThis.clearInterval(id);
    },
    setTimeout: (callback, milliseconds) => {
      const id = globalThis.setTimeout(callback, milliseconds);
      return () => globalThis.clearTimeout(id);
    },
    isVisible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
    onVisibilityChange: (callback) => {
      if (typeof document === 'undefined') return () => undefined;
      document.addEventListener('visibilitychange', callback);
      return () => document.removeEventListener('visibilitychange', callback);
    },
    storage,
    randomSeed: () => {
      try {
        const values = new Uint32Array(1);
        globalThis.crypto.getRandomValues(values);
        const value = values[0];
        if (value !== undefined) return (value % MAX_SEED) + 1;
      } catch {
        // Fresh randomness is best effort; play remains available.
      }
      return Math.floor(Math.random() * MAX_SEED) + 1;
    },
  };
}

