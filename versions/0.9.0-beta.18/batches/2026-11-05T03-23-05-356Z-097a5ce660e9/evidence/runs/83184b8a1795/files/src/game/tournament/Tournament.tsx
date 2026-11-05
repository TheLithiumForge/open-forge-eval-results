import { useState } from 'react';
import { PlayingBoard } from './PlayingBoard.tsx';
import { formatElapsed } from '../elapsed-time.ts';
import { Bracket } from './Bracket.tsx';
import { Setup } from './Setup.tsx';
import { ExchangePanel } from './ExchangePanel.tsx';
import { decodeExchange, encodeExchange } from './format.ts';
import { LeaveDialog } from './LeaveDialog.tsx';
import { winner } from './model.ts';
import { MatchControls } from './MatchControls.tsx';
import { makeMatch } from './make-match.ts';
import { readTournaments, saveTournaments } from './storage.ts';
import { useTournamentGame } from './use-tournament-game.ts';
import { useNotice } from './use-notice.ts';
import { useScreenFocus } from './use-screen-focus.ts';
import type { Result, TournamentState } from './model.ts';
import './tournament.css';
export function Tournament({ back }: { back(): void }) {
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [playing, setPlaying] = useState(false),
    [pendingSnapshot, setPendingSnapshot] = useState<string | null>(null);
  const [json, setJson] = useState(''),
    [confirm, setConfirm] = useState<(() => void) | null>(null);
  const [notice, setNotice, noticeId] = useNotice();
  const [saved] = useState(readTournaments),
    [past, setPast] = useState(saved.items),
    [unavailable, setUnavailable] = useState(saved.unavailable);
  const match = tournament?.matches.at(-1),
    champion =
      tournament && match && tournament.matches.length === tournament.names.length - 1
        ? winner(match)
        : null;
  const heading = useScreenFocus(playing, handoff, tournament, champion ?? null);
  function remember(t: TournamentState) {
    const serialized = encodeExchange({ tournament: t, snapshot: null });
    const items = [
      t,
      ...past.filter((item) => encodeExchange({ tournament: item, snapshot: null }) !== serialized),
    ].slice(0, 10);
    setPast(items);
    if (!saveTournaments(items).saved) setUnavailable(true);
  }
  function record(result: Result) {
    if (!tournament || !match) return;
    const updated = {
      ...tournament,
      matches: [
        ...tournament.matches.slice(0, -1),
        { ...match, results: [...match.results, result] },
      ],
    };
    setTournament(updated);
    setHandoff(true);
    setPlaying(false);
    setPendingSnapshot(null);
    const last = updated.matches.at(-1);
    if (updated.matches.length === updated.names.length - 1 && last && winner(last) !== null) {
      remember(updated);
    }
    setNotice(
      `Pair found. All pairs found in ${result.moves} moves and ${formatElapsed(result.elapsedMs)}.`,
    );
  }
  const game = useTournamentGame(record);
  function startTournament(names: string[]) {
    setHandoff(false);
    setTournament(makeMatch({ names, matches: [] }));
    setNotice(`Now playing: ${names[0]}`);
  }
  function startTurn() {
    if (!match) return;
    game.start(match.code, pendingSnapshot);
    setPendingSnapshot(null);
    setPlaying(true);
    setNotice(`Now playing: ${tournament?.names[match.players[match.results.length] ?? 0]}`);
  }
  function leaveOr(action: () => void) {
    if (tournament && champion === null) setConfirm(() => action);
    else action();
  }
  function load() {
    const decoded = decodeExchange(json);
    if (!decoded.data) {
      setNotice(decoded.error);
      return;
    }
    const data = decoded.data;
    leaveOr(() => {
      game.stop();
      const imported = data.tournament;
      const last = imported?.matches.at(-1);
      if (
        imported &&
        imported.matches.length === imported.names.length - 1 &&
        last &&
        winner(last) !== null
      )
        remember(imported);
      setTournament(imported);
      setHandoff(Boolean(data.tournament?.matches.at(-1)?.results.length === 1 && !data.snapshot));
      setPendingSnapshot(data.snapshot);
      setPlaying(false);
      setNotice('Tournament loaded.');
      setConfirm(null);
    });
  }
  const player =
    tournament && match && match.results.length < 2
      ? tournament.names[match.players[match.results.length] ?? 0]
      : null;
  return (
    <>
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      {!tournament && (
        <Setup
          past={past}
          unavailable={unavailable}
          back={back}
          start={startTournament}
          view={(t) => {
            setTournament(t);
            setNotice('Tournament loaded.');
          }}
          error={setNotice}
        />
      )}
      {tournament && (
        <section className="tournament-section">
          {champion !== null && champion !== undefined ? (
            <>
              <p>Champion: {tournament.names[champion]}</p>
              <button className="control" onClick={back}>
                Back to game
              </button>
              <button
                className="control"
                onClick={() => {
                  setTournament(null);
                  setNotice('');
                }}
              >
                Tournament setup
              </button>
            </>
          ) : (
            <MatchControls
              tournament={tournament}
              player={player}
              playing={playing}
              handoff={handoff}
              start={startTurn}
              nextTurn={() => {
                setHandoff(false);
                setNotice(`Now playing: ${player}`);
              }}
              nextMatch={() => {
                setTournament(makeMatch(tournament));
                setHandoff(false);
                setNotice('Next match.');
              }}
              leave={() => leaveOr(back)}
            />
          )}
          <Bracket tournament={tournament} />
        </section>
      )}
      {playing && (
        <PlayingBoard
          session={game.session}
          activate={(index) => {
            setNotice('');
            game.activate(index);
          }}
        />
      )}
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={notice ? `notice-${noticeId}` : `game-${game.session.announcement}`}>
            {playing ? notice || game.session.feedback : notice}
          </span>
        </p>
      </div>
      <ExchangePanel
        json={json}
        edit={setJson}
        load={load}
        exportData={() => {
          setJson(
            encodeExchange({ tournament, snapshot: playing ? game.exportGame() : pendingSnapshot }),
          );
          setNotice('Tournament exported.');
        }}
      />
      {confirm && <LeaveDialog keep={() => setConfirm(null)} leave={confirm} />}
    </>
  );
}
