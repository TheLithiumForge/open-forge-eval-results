import { useRef, useState } from 'react';
import { createGame } from '../game.ts';
import { unusedBoardCode } from '../session/fresh-board.ts';
import { activatePlay } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import { acceptedName, nameProblem } from './names.ts';
import { completedGame, continueTournament, isFinished, lastTurn, matchSizes } from './rules.ts';
import { nextTurn, recordResult, startTournament } from './rules.ts';
import { nowPlaying, TournamentNotice, unknownFieldText } from './tournament-labels.ts';
import { usePastTournaments } from './use-past-tournaments.ts';
import type { GameState } from '../game.ts';
import type { Play } from '../session/session.ts';
import type { Tournament } from './rules.ts';

const NOT_STARTED: Tournament = { players: [], matches: [], reviewing: false };

export const TournamentStep = {
  setup: 'setup',
  ready: 'ready',
  playing: 'playing',
  review: 'review',
  finished: 'finished',
} as const;

// Tournament games never reach saved preferences, so a turn plays without them.
function playOf(game: GameState, generation: number): Play {
  return { game, paused: false, generation, feedback: '', announcement: 0, celebration: false };
}

// Holds one tournament and its current game. screenChanged moves focus to the screen heading.
export function useTournament(screenChanged: () => void) {
  const past = usePastTournaments();
  const [tournament, setTournament] = useState(NOT_STARTED);
  const [play, setPlay] = useState<Play | null>(null);
  const [status, setStatus] = useState({ text: '', key: 0 });
  const held = useRef(tournament);
  const turn = useRef(play);
  const generation = useRef(0);

  function commitTournament(next: Tournament): void {
    held.current = next;
    setTournament(next);
  }
  function commitPlay(next: Play | null): void {
    if (next === turn.current) return;
    turn.current = next;
    setPlay(next);
  }
  const clock = useSessionClock(play, turn, commitPlay, true);
  function publish(text: string): void {
    setStatus((previous) => ({ text, key: previous.key + 1 }));
  }
  function newPlay(game: GameState): Play {
    clock.reset();
    generation.current += 1;
    return playOf(game, generation.current);
  }
  // A loaded review, a finished event or no players has no turn waiting.
  function announceNext(next: Tournament): void {
    const upcoming = next.reviewing ? null : nextTurn(next);
    const name = upcoming && next.players[upcoming.player];
    publish(name ? nowPlaying(name) : TournamentNotice.loaded);
  }

  function reset(): void {
    commitTournament(NOT_STARTED);
    commitPlay(null);
    publish('');
  }

  function start(drafts: readonly string[]): void {
    const players = drafts.map(acceptedName);
    const problem = nameProblem(players);
    if (problem) return publish(problem);
    const used = new Set<string>();
    const codes = matchSizes(players.length).map((size) => {
      const code = unusedBoardCode(size, used);
      used.add(code);
      return code;
    });
    const started = startTournament(players, codes);
    commitTournament(started);
    announceNext(started);
    screenChanged();
  }

  function startTurn(): void {
    const upcoming = nextTurn(held.current);
    if (!upcoming || turn.current) return;
    commitPlay(newPlay(createGame(upcoming.boardCode)));
    screenChanged();
  }

  function activate(index: number): void {
    clock.synchronize();
    const before = turn.current;
    if (!before) return;
    const after = activatePlay(before, index);
    commitPlay(after);
    if (after.announcement !== before.announcement) publish(after.feedback);
    if (after === before || !after.celebration) return;
    const recorded = recordResult(held.current, after.game);
    commitTournament(recorded);
    if (!isFinished(recorded)) return;
    past.save(recorded);
    commitPlay(null);
    screenChanged();
  }

  function next(): void {
    const continued = continueTournament(held.current);
    commitTournament(continued);
    commitPlay(null);
    announceNext(continued);
    screenChanged();
  }

  // An unfinished turn isn't part of the export, so loading it starts that turn again.
  function exportTournament(): string {
    return encodeTournament(held.current);
  }

  function load(text: string): void {
    const read = decodeTournament(text);
    if (!read) return publish(TournamentNotice.invalid);
    if ('unknownField' in read) return publish(unknownFieldText(read.unknownField));
    const loaded = read.tournament;
    const shown = loaded.reviewing ? lastTurn(loaded) : null;
    const result = shown && loaded.matches[shown.match]?.results[shown.slot];
    commitPlay(shown && result ? newPlay(completedGame(shown.boardCode, result)) : null);
    commitTournament(loaded);
    announceNext(loaded);
    screenChanged();
  }

  const step =
    tournament.players.length === 0
      ? TournamentStep.setup
      : isFinished(tournament)
        ? TournamentStep.finished
        : tournament.reviewing
          ? TournamentStep.review
          : play
            ? TournamentStep.playing
            : TournamentStep.ready;
  return {
    step,
    tournament,
    play,
    status,
    past,
    reset,
    start,
    startTurn,
    activate,
    next,
    exportTournament,
    load,
  };
}

export type TournamentView = ReturnType<typeof useTournament>;
