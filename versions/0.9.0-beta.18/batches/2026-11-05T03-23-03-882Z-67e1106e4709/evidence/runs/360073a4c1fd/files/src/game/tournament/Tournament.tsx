import { useEffect, useRef, useState } from 'react';
import { parseBoardCode } from '../deck.ts';
import { Bracket } from './Bracket.tsx';
import { Exchange } from './Exchange.tsx';
import { Setup } from './Setup.tsx';
import { Turn } from './Turn.tsx';
import { encodeTournament } from './format.ts';
import { matchPlayers, matchWinner, roundName, TournamentPhase } from './rules.ts';
import { useTournament } from './use-tournament.ts';
import type { ReactNode } from 'react';
import type { TournamentTurn } from './Turn.tsx';
import './tournament.css';

interface TournamentProps {
  active: boolean;
  status: ReactNode;
  announce(text: string): void;
  confirm(action: () => void): void;
  back(): void;
}

export function Tournament({ active, status, announce, confirm, back }: TournamentProps) {
  const controller = useTournament(announce, confirm);
  const { tournament, players, restored, generation, notice, history } = controller;
  const heading = useRef<HTMLHeadingElement>(null);
  const turn = useRef<TournamentTurn>(null);
  const [draft, setDraft] = useState('');
  useEffect(() => {
    if (active) heading.current?.focus();
  }, [active, tournament?.phase, generation]);
  if (!active) return null;
  const match = tournament?.matches[tournament.matchIndex];
  const player = tournament
    ? matchPlayers(tournament, tournament.matchIndex)[match?.results.length ?? 0]
    : null;
  const winner = tournament ? matchWinner(tournament, tournament.matchIndex) : null;
  const complete = tournament?.phase === TournamentPhase.complete;
  function leave(): void {
    const action = () => {
      controller.reset();
      back();
    };
    if (tournament && !complete) confirm(action);
    else action();
  }
  return (
    <section className="tournament-screen">
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      <p className="help">
        One device, one deal per match. Fewer moves wins; ties use active time, then seed.
      </p>
      {tournament && match && <p>Round: {roundName(parseBoardCode(match.boardCode)?.size ?? 8)}</p>}
      {tournament &&
        player != null &&
        (tournament.phase === TournamentPhase.ready ||
          tournament.phase === TournamentPhase.playing) && (
          <p className="tournament-player">Now playing: {tournament.players[player]}</p>
        )}
      {complete && winner != null && (
        <p className="victory">Champion: {tournament?.players[winner]}</p>
      )}
      <div className="tournament-actions">
        <button className="control" onClick={leave}>
          {complete ? 'Back to game' : 'Leave tournament'}
        </button>
        {tournament?.phase === TournamentPhase.ready && (
          <button className="control" onClick={controller.begin}>
            Start turn
          </button>
        )}
        {tournament?.phase === TournamentPhase.turnOver && (
          <button className="control" onClick={controller.advance}>
            Next turn
          </button>
        )}
        {tournament?.phase === TournamentPhase.matchOver && (
          <button className="control" onClick={controller.advance}>
            Next match
          </button>
        )}
      </div>
      {!tournament && (
        <Setup
          players={players}
          change={controller.setPlayers}
          start={controller.start}
          notice={notice}
        />
      )}
      {status}
      {tournament?.phase === TournamentPhase.playing && match && (
        <Turn
          key={generation}
          ref={turn}
          code={match.boardCode}
          restored={restored}
          announce={announce}
          finish={controller.finish}
        />
      )}
      {tournament && <Bracket tournament={tournament} />}
      {!tournament && (
        <section className="past-tournaments">
          <h3>Past tournaments</h3>
          {!history.available && <p>Progress won't be saved on this device.</p>}
          {history.items.length === 0 && <p>No finished tournaments yet.</p>}
          {history.items.map((item, index) => {
            const champion = matchWinner(item, item.matches.length - 1);
            return (
              <button
                className="control"
                key={index}
                onClick={() => controller.load(encodeTournament(item, item.players, null))}
              >
                Champion: {champion == null ? '' : item.players[champion]} · {item.players.length}{' '}
                players
              </button>
            );
          })}
        </section>
      )}
      <Exchange
        draft={draft}
        change={setDraft}
        notice={notice}
        load={() => controller.load(draft)}
        exportTournament={() =>
          setDraft(encodeTournament(tournament, players, turn.current?.readGame() ?? null))
        }
      />
    </section>
  );
}
