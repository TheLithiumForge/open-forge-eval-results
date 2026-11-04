import type { GameState } from '../state.ts';

export interface Announcement {
  readonly id: number;
  readonly text: string;
}

export interface SessionView {
  readonly game: GameState;
  readonly paused: boolean;
  readonly celebrate: boolean;
  readonly revision: number;
  readonly best: number | null;
  readonly announcement: Announcement | null;
  readonly loadStatus: string;
}

export interface ClockPorts {
  readonly now: () => number;
  readonly isHidden: () => boolean;
  readonly schedule: (callback: () => void, delay: number) => () => void;
  readonly watchVisibility: (callback: () => void) => () => void;
}
