import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameState } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { TournamentProgress } from './Progress.tsx';
import { TournamentHistory } from './History.tsx';
import { Bracket } from './Bracket.tsx';
import { TournamentExchange } from './Exchange.tsx';
import { TournamentSetupForm } from './Setup.tsx';
import { TournamentTurn } from './Turn.tsx';
import type { TournamentTurnHandle } from './Turn.tsx';
import { decodeTournament, encodeTournament } from './format.ts';
import { freshTournamentDeals } from './fresh-deals.ts';
import {
  createTournament,
  finishTournamentTurn,
  isTournamentComplete,
  nameProblem,
  tournamentBracket,
  TournamentPhase,
} from './rules.ts';
import type { Tournament, TournamentState } from './rules.ts';
import './tournament.css';

interface TournamentProps {
  status: ReactNode;
  publish(message: string): void;
  leave(): void;
  confirm(action: () => void): void;
  history: { items: readonly Tournament[]; blocked: boolean; save(item: Tournament): void };
}

export function TournamentScreen({ status, publish, leave, confirm, history }: TournamentProps) {
  const [state, setState] = useState<TournamentState>({ names: ['', '', '', ''] });
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const [generation, setGeneration] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const turn = useRef<TournamentTurnHandle>(null);
  const tournament = 'deals' in state ? state : null;
  const complete = tournament ? isTournamentComplete(tournament) : false;
  const bracket = tournament ? tournamentBracket(tournament) : [];
  const index = tournament
    ? Math.floor(
        (tournament.results.length - (tournament.phase === TournamentPhase.finished ? 1 : 0)) / 2,
      )
    : 0;
  const match = bracket[index];
  const playerIndex = tournament
    ? (tournament.results.length - (tournament.phase === TournamentPhase.finished ? 1 : 0)) % 2
    : 0;
  const player = match?.players[playerIndex];
  const name = player == null ? '' : state.names[player];
  const screen = tournament
    ? `${generation}-${tournament.phase}-${tournament.results.length}`
    : 'setup';
  useLayoutEffect(() => {
    heading.current?.focus();
  }, [screen]);

  function replace(next: TournamentState): void {
    setState(next);
    setGeneration((value) => value + 1);
    setProblem('');
    setNotice('');
    setCelebration(false);
  }
  function start(): void {
    const error = nameProblem(state.names);
    if (error) {
      setProblem(error);
      publish(error);
      return;
    }
    const next = createTournament(state.names, freshTournamentDeals(state.names.length));
    replace(next);
    const first = tournamentBracket(next)[0]?.players[0];
    publish(`${first == null ? '' : next.names[first]}, select Start turn.`);
  }
  function finish(game: GameState): void {
    if (!tournament) return;
    const next = finishTournamentTurn(tournament, game);
    setCelebration(true);
    setState(next);
    if (isTournamentComplete(next)) {
      history.save(next);
      const seed = tournamentBracket(next).at(-1)?.winner;
      publish(`${seed == null ? '' : next.names[seed]} wins the tournament.`);
    } else
      publish(
        `${name} finished in ${game.moves} moves and ${formatElapsed(game.elapsedMs)}. ` +
          (next.results.length % 2 === 0 ? 'Select Next match.' : 'Select Next turn.'),
      );
  }
  function load(text: string): void {
    const decoded = decodeTournament(text);
    if (!decoded.state) {
      setNotice(decoded.error);
      publish(decoded.error);
      return;
    }
    const accepted = decoded.state;
    function apply(): void {
      const next =
        'deals' in accepted && accepted.phase === TournamentPhase.playing
          ? { ...accepted, phase: TournamentPhase.ready }
          : accepted;
      replace(next);
      if ('deals' in next && isTournamentComplete(next)) history.save(next);
      setNotice('Loaded tournament.');
      publish('Loaded tournament.');
    }
    if (tournament && !complete) confirm(apply);
    else apply();
  }
  return (
    <section className="tournament" aria-label="Tournament">
      <h2 ref={heading} tabIndex={-1}>
        {complete ? 'Tournament complete' : 'Tournament'}
      </h2>
      {!tournament ? (
        <TournamentSetupForm
          names={state.names}
          problem={problem}
          change={(names) => setState({ names })}
          start={start}
        />
      ) : (
        <TournamentProgress
          tournament={tournament}
          change={setState}
          publish={publish}
          celebration={celebration}
        />
      )}
      {status}
      {tournament?.phase === TournamentPhase.playing && (
        <TournamentTurn
          key={generation}
          game={tournament.game}
          ref={turn}
          finish={finish}
          publish={publish}
        />
      )}
      {tournament && <Bracket tournament={tournament} />}
      <div className="tournament-actions">
        {tournament && !complete ? (
          <button className="control" type="button" onClick={() => confirm(leave)}>
            Leave tournament
          </button>
        ) : (
          <button className="control" type="button" onClick={leave}>
            Back to game
          </button>
        )}
        {complete && (
          <button
            className="control"
            type="button"
            onClick={() => {
              replace({ names: ['', '', '', ''] });
              publish('Choose players for a tournament.');
            }}
          >
            New tournament
          </button>
        )}
      </div>
      <TournamentExchange
        notice={notice}
        loadTournament={load}
        exportTournament={() => {
          const game = turn.current?.snapshot();
          return encodeTournament(tournament && game ? { ...tournament, game } : state);
        }}
      />
      <TournamentHistory
        history={history}
        open={(item) => {
          const open = () => {
            replace(item);
            publish('Loaded past tournament.');
          };
          if (tournament && !complete) confirm(open);
          else open();
        }}
      />
    </section>
  );
}
