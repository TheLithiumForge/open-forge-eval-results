import { useEffect, useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import {
  createTournament,
  matchPlayers,
  matchWinner,
  nameProblem,
  nextTurn,
  recordTurn,
  roundFor,
  startTurn,
  tournamentDraft,
  TournamentPhase,
} from './rules.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import { tournamentDeals } from './deals.ts';
import type { GameState } from '../game.ts';
import type { TournamentState } from './rules.ts';
import type { TournamentTurnHandle } from './TournamentTurn.tsx';

export function useTournament(
  announce: (message: string) => void,
  remember: (state: TournamentState) => void,
) {
  const [state, setState] = useState(tournamentDraft);
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const [loadedTurn, setLoadedTurn] = useState(false);
  const [celebration, setCelebration] = useState(false);
  const [generation, setGeneration] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const turn = useRef<TournamentTurnHandle>(null);
  const match = state.matches[state.matchIndex];
  const complete = state.phase === TournamentPhase.complete;
  const setup = state.phase === TournamentPhase.setup;
  const winner = complete ? matchWinner(state, state.matches.length - 1) : null;
  const turnIndex = (match?.results.length ?? 0) - (state.phase === TournamentPhase.result ? 1 : 0);
  const player = matchPlayers(state, state.matchIndex)[turnIndex];
  const name = player === undefined ? '' : (state.names[player] ?? '');
  const round = roundFor(state.names.length, state.matchIndex);

  useEffect(() => {
    heading.current?.focus();
  }, [state.phase, state.matchIndex, match?.results.length, loadedTurn, generation]);

  function adopt(next: TournamentState): void {
    setState(next);
    setLoadedTurn(next.phase === TournamentPhase.playing);
    setGeneration((value) => value + 1);
    setProblem('');
    setCelebration(false);
    if (next.phase === TournamentPhase.complete) remember(next);
    announce(
      next.phase === TournamentPhase.complete
        ? `Champion: ${next.names[matchWinner(next, next.matches.length - 1) ?? 0]}`
        : next.phase === TournamentPhase.setup
          ? 'Tournament setup.'
          : 'Loaded tournament. Select Start turn to play.',
    );
  }

  function confirm(action: () => void): void {
    if (!complete && (!setup || state.names.some((name) => name.trim()))) setLeave(() => action);
    else action();
  }

  function start(): void {
    const error = nameProblem(state.names);
    setProblem(error);
    if (error) {
      announce(error);
      return;
    }
    const next = createTournament(state.names, tournamentDeals(state.names.length));
    setState(next);
    const first = matchPlayers(next, 0)[0] ?? 0;
    announce(`Round: ${roundFor(next.names.length, 0).name}. Now playing: ${next.names[first]}`);
  }

  function played(game: GameState): void {
    const next = recordTurn(state, game);
    setState(next);
    if (!isWon(game)) return;
    setCelebration(true);
    const champion = matchWinner(next, next.matchIndex);
    announce(
      `Pair found. All pairs found in ${game.moves} moves and ${formatElapsed(game.elapsedMs)}. ` +
        (next.phase === TournamentPhase.complete
          ? `Champion: ${next.names[champion ?? 0]}`
          : `${name} finished.`),
    );
    if (next.phase === TournamentPhase.complete) remember(next);
  }

  function load(text: string): void {
    const decoded = decodeTournament(text);
    if (!decoded.state) {
      setNotice(decoded.problem);
      announce(decoded.problem);
      return;
    }
    const accepted = decoded.state;
    confirm(() => {
      adopt(accepted);
      setNotice('Loaded tournament.');
    });
  }

  function begin(): void {
    setLoadedTurn(false);
    setState(startTurn(state));
    announce(`Now playing: ${name}`);
  }
  function proceed(): void {
    setCelebration(false);
    const next = nextTurn(state);
    setState(next);
    const player = matchPlayers(next, next.matchIndex)[
      next.matches[next.matchIndex]?.results.length ?? 0
    ];
    announce(
      `Round: ${roundFor(next.names.length, next.matchIndex).name}. Now playing: ${next.names[player ?? 0]}`,
    );
  }
  function exportTournament(): string {
    return encodeTournament({ ...state, game: turn.current?.currentGame() ?? state.game });
  }
  return {
    state,
    setState,
    problem,
    notice,
    leave,
    setLeave,
    loadedTurn,
    celebration,
    generation,
    heading,
    turn,
    match,
    complete,
    setup,
    winner,
    name,
    round,
    adopt,
    confirm,
    start,
    played,
    load,
    begin,
    proceed,
    exportTournament,
  };
}
