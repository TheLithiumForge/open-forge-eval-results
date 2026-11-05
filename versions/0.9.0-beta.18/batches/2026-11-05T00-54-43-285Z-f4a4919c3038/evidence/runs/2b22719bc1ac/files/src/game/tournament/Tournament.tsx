import { useEffect, useRef, useState } from 'react';
import { tournamentDeals } from './deals.ts';
import { Champion } from './Champion.tsx';
import { Bracket } from './Bracket.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { decodeTournament, encodeTournament } from './format.ts';
import { TournamentActions } from './TournamentActions.tsx';
import { TournamentExchange } from './TournamentExchange.tsx';
import { PastTournaments } from './PastTournaments.tsx';
import { formatElapsed } from '../elapsed-time.ts';
import { nameError } from './names.ts';
import { createTournament, finishTurn, startTurn, TournamentPhase, turnIndex } from './rules.ts';
import type { TournamentHistory } from './use-history.ts';
import type { Result, TournamentState } from './rules.ts';
import type { TurnExport } from './TournamentPlay.tsx';
import type { TournamentDocument } from './format.ts';
import './tournament.css';

interface TournamentProps {
  history: TournamentHistory;
  back(): void;
  publish(text: string): void;
  confirm(action: () => void): void;
}

export function Tournament({ history, back, publish, confirm }: TournamentProps) {
  const [names, setNames] = useState<readonly string[]>(['', '', '', '']);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const turn = useRef<TurnExport>(null);
  const playedChampion = useRef<TournamentState | null>(null);
  const complete = tournament?.phase === TournamentPhase.complete;
  const orientation = tournament
    ? complete
      ? 'champion'
      : `${tournament.matchIndex}:${turnIndex(tournament)}:${tournament.phase === TournamentPhase.ready || tournament.phase === TournamentPhase.playing ? 'turn' : 'result'}`
    : 'setup';
  useEffect(() => {
    heading.current?.focus();
    if (
      tournament &&
      (tournament.phase === TournamentPhase.ready || tournament.phase === TournamentPhase.playing)
    ) {
      const match = tournament.matches[tournament.matchIndex];
      const player = match?.players[turnIndex(tournament)];
      if (player !== undefined) publish(`Now playing: ${tournament.players[player]}`);
    }
  }, [orientation, revision]);

  function showNotice(text: string): void {
    setNotice(text);
    publish(text);
  }
  function start(): void {
    const error = nameError(names);
    if (error) {
      showNotice(error);
      return;
    }
    const next = createTournament(names, tournamentDeals(names.length));
    setNames(next.players);
    setTournament(next);
    setNotice('');
  }
  function finish(result: Result): void {
    if (!tournament) return;
    const next = finishTurn(tournament, result);
    setTournament(next);
    if (next.phase === TournamentPhase.complete) {
      playedChampion.current = next;
      history.save(next);
      const champion = next.matches.at(-1)?.winner;
      publish(
        `Pair found. All pairs found in ${result.moves} moves and ${formatElapsed(result.elapsedMs)}. Champion: ${champion === undefined || champion === null ? '' : next.players[champion]}`,
      );
    }
  }
  function accept(data: TournamentDocument): void {
    setNames(data.names);
    setSnapshot(data.snapshot);
    setTournament(data.tournament);
    setRevision((value) => value + 1);
    if (data.tournament?.phase === TournamentPhase.complete) history.save(data.tournament);
    showNotice('Loaded tournament.');
  }
  function load(): void {
    const result = decodeTournament(json);
    if (!result.data) {
      showNotice(result.error);
      return;
    }
    const data = result.data;
    if ((tournament && !complete) || (!tournament && names.some((name) => name.trim())))
      confirm(() => accept(data));
    else accept(data);
  }
  function exportCurrent(): void {
    setJson(
      encodeTournament({
        names,
        tournament,
        snapshot:
          tournament?.phase === TournamentPhase.playing
            ? (turn.current?.exportTurn() ?? null)
            : null,
      }),
    );
  }
  return (
    <section className="tournament">
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      {!tournament && <TournamentSetup names={names} change={setNames} start={start} />}
      {tournament && (
        <>
          {complete ? (
            <Champion tournament={tournament} celebration={playedChampion.current === tournament} />
          ) : (
            <>
              <TournamentPlay
                key={`${revision}:${tournament.matchIndex}:${turnIndex(tournament)}`}
                ref={turn}
                tournament={tournament}
                snapshot={snapshot}
                publish={publish}
                finish={finish}
                started={() => {
                  setTournament(startTurn(tournament));
                  heading.current?.focus();
                }}
              />
              <TournamentActions
                tournament={tournament}
                leave={() => confirm(back)}
                advance={(next) => {
                  setSnapshot(null);
                  setTournament(next);
                }}
              />
            </>
          )}
          <Bracket tournament={tournament} />
        </>
      )}
      {(!tournament || complete) && (
        <button
          className="control"
          type="button"
          onClick={() => {
            if (!tournament && names.some((name) => name.trim())) confirm(back);
            else back();
          }}
        >
          Back to game
        </button>
      )}
      <TournamentExchange
        json={json}
        change={setJson}
        exportCurrent={exportCurrent}
        load={load}
        notice={notice}
      />
      {!tournament && (
        <PastTournaments
          items={history.items}
          blocked={history.blocked}
          open={(item) => {
            setNames(item.players);
            setTournament(item);
            setSnapshot(null);
          }}
        />
      )}
      {tournament && history.blocked && <p>Progress won't be saved on this device.</p>}
    </section>
  );
}
