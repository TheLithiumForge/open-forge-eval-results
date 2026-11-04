import type { Size } from '../boardCode.ts';
import type { GameState } from '../state.ts';
import type { StoragePort } from './storage.ts';

export interface Announcement { readonly id: number; readonly text: string }
export interface SessionView {
  readonly game: GameState;
  readonly paused: boolean;
  readonly revision: number;
  readonly best: number | null;
  readonly announcement: Announcement;
  readonly status: string;
  readonly celebrate: boolean;
}
export interface SessionEnvironment {
  readonly now: () => number;
  readonly seed: (previous: number) => number;
  readonly storage: StoragePort | null;
  readonly visible: boolean;
}
export interface SessionActions {
  readonly activate: (index: number) => void;
  readonly newGame: () => void;
  readonly restart: () => void;
  readonly chooseSize: (size: Size) => void;
  readonly loadBoard: (text: string) => boolean;
  readonly loadSnapshot: (text: string) => boolean;
  readonly exportSnapshot: () => string;
  readonly resume: () => void;
}
