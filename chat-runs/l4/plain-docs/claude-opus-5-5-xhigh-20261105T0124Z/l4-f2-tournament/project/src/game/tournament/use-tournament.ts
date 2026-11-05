import { useRef, useState } from 'react';
import { freshBoardCode } from '../session/fresh-board.ts';
import { decodeTournament, encodeTournament, TournamentNotice } from './format.ts';
import { acceptedName, nameProblem } from './names.ts';
import {
  attemptCount,
  boardSizes,
  champion,
  currentTurn,
  playerName,
  recordAttempt,
} from './rules.ts';
import type { Attempt, Match, Tournament } from './rules.ts';

// The shown game is turn `turn` in bracket order: match floor(turn / 2), side turn % 2. It stays
// shown after it ends until Next turn or Next match, which set `handoff`.
export interface Run {
  readonly id: number;
  readonly tournament: Tournament;
  readonly turn: number;
  readonly handoff: boolean;
}

// Every match gets its own fresh deal at its round's size, so no two matches share a code.
function deal(count: number): Match[] {
  const used = new Set<string>();
  return boardSizes(count).map((size) => {
    let boardCode = freshBoardCode(size);
    while (used.has(boardCode)) boardCode = freshBoardCode(size);
    used.add(boardCode);
    return { boardCode, attempts: [] };
  });
}

export function useTournament(
  announce: (text: string) => void,
  save: (tournament: Tournament) => void,
) {
  const [run, setRun] = useState<Run | null>(null);
  const current = useRef(run);
  const runs = useRef(0);

  function commit(next: Run | null): void {
    current.current = next;
    setRun(next);
  }

  function announceTurn(tournament: Tournament): void {
    const turn = currentTurn(tournament);
    announce(
      turn ? `Now playing: ${playerName(tournament, turn.seed)}` : TournamentNotice.loadedCompleted,
    );
  }

  function begin(tournament: Tournament): void {
    runs.current += 1;
    commit({ id: runs.current, tournament, turn: attemptCount(tournament), handoff: false });
    announceTurn(tournament);
  }

  // Names become accepted names here, and a failed check blocks the action with its message.
  function plan(drafts: readonly string[]): Tournament | null {
    const players = drafts.map(acceptedName);
    const problem = nameProblem(players);
    if (problem !== null) {
      announce(problem);
      return null;
    }
    return { players, matches: deal(players.length) };
  }

  function start(drafts: readonly string[]): void {
    const tournament = plan(drafts);
    if (tournament) begin(tournament);
  }

  function finish(attempt: Attempt): void {
    const shown = current.current;
    if (!shown) return;
    const tournament = recordAttempt(shown.tournament, attempt);
    commit({ ...shown, tournament });
    if (champion(tournament) !== null) save(tournament);
  }

  function next(): void {
    const shown = current.current;
    if (!shown) return;
    commit({ ...shown, turn: shown.turn + 1, handoff: true });
    announceTurn(shown.tournament);
  }

  function leave(): void {
    commit(null);
  }

  // Before a tournament starts, export describes the one the entered names would start.
  function exportJson(drafts: readonly string[]): string | null {
    const shown = current.current;
    const tournament = shown ? shown.tournament : plan(drafts);
    return tournament ? encodeTournament(tournament) : null;
  }

  // A loaded tournament continues at its next unplayed game. A failed load changes nothing.
  function load(text: string): boolean {
    const read = decodeTournament(text);
    if ('notice' in read) {
      announce(read.notice);
      return false;
    }
    begin(read.tournament);
    return true;
  }

  return { run, start, finish, next, leave, exportJson, load };
}
