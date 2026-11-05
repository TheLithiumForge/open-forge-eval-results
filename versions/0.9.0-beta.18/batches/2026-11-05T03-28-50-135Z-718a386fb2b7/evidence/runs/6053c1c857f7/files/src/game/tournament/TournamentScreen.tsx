import { useEffect, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import type { BoardFocus } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { Bracket } from './Bracket.tsx';
import { ConfirmLeave } from './ConfirmLeave.tsx';
import { roundName } from './rules.ts';
import { useTournament } from './use-tournament.ts';
import { TournamentSetup } from './TournamentSetup.tsx';
import './tournament.css';

export function TournamentScreen({ back }: { back(): void }) {
  const {
    count,
    setCount,
    names,
    setNames,
    tournament,
    setTournament,
    history,
    json,
    setJson,
    notice,
    dialog,
    announcement,
    setAnnouncement,
    controller,
    session,
    match,
    active,
    player,
    start,
    begin,
    confirm,
    keep,
    load,
    exportCurrent,
    exportPast,
  } = useTournament();
  const heading = useRef<HTMLHeadingElement>(null);
  const board = useRef<BoardFocus>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [tournament?.phase, tournament?.current]);
  return (
    <>
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      {!tournament && (
        <TournamentSetup
          count={count}
          setCount={setCount}
          names={names}
          setNames={setNames}
          notice={notice}
          start={start}
          back={back}
        />
      )}
      {tournament && (
        <section className="tournament-current">
          {tournament.phase !== 'complete' && (
            <>
              <p>Round: {roundName(tournament.names.length, tournament.current)}</p>
              <p>Now playing: {player == null ? '' : tournament.names[player]}</p>
            </>
          )}
          {tournament.phase === 'ready' && (
            <button className="control" onClick={begin}>
              Start turn
            </button>
          )}
          {tournament.phase === 'turnDone' && (
            <button
              className="control"
              onClick={() => {
                setTournament({ ...tournament, phase: 'ready' });
                setAnnouncement(`Now playing: ${tournament.names[match?.players[1] ?? 0]}`);
              }}
            >
              Next turn
            </button>
          )}
          {tournament.phase === 'matchDone' && (
            <button
              className="control"
              onClick={() => {
                const current = tournament.current + 1;
                setTournament({ ...tournament, current, phase: 'ready' });
                setAnnouncement(
                  `Now playing: ${tournament.names[tournament.matches[current]?.players[0] ?? 0]}`,
                );
              }}
            >
              Next match
            </button>
          )}
          {tournament.phase === 'complete' ? (
            <>
              <p className="champion">Champion: {tournament.names[match?.winner ?? 0]}</p>
              <button className="control" onClick={back}>
                Back to game
              </button>
            </>
          ) : (
            <button className="control" onClick={() => confirm(back)}>
              Leave tournament
            </button>
          )}
          {active && (
            <>
              <GameStatus
                game={session.game}
                best={undefined}
                celebration={session.celebration}
                hideBest
              />
              <p id="board-help" className="help">
                Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or
                Space reveals a card.
              </p>
              {session.paused && (
                <button className="control" onClick={controller.resume}>
                  Resume
                </button>
              )}
            </>
          )}
          <div className="game-result">
            <p role="status" aria-live="polite" aria-atomic="true">
              <span key={`${session.announcement}-${announcement}`}>
                {active && session.feedback ? session.feedback : announcement}
              </span>
            </p>
          </div>
          {active && (
            <Board
              key={session.generation}
              game={session.game}
              activate={controller.activate}
              ref={board}
            />
          )}
          <Bracket tournament={tournament} />
        </section>
      )}
      {!tournament && (
        <div className="game-result">
          <p role="status" aria-live="polite" aria-atomic="true">
            {announcement}
          </p>
        </div>
      )}
      <section className="exchange">
        <h3>Tournament JSON</h3>
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          className="control"
          id="tournament-json"
          rows={6}
          value={json}
          onChange={(e) => setJson(e.currentTarget.value)}
        />
        <div className="tournament-actions">
          <button className="control" onClick={exportCurrent}>
            Export tournament
          </button>
          <button className="control" onClick={load} aria-describedby="tournament-notice">
            Load tournament
          </button>
        </div>
        <p id="tournament-notice">{notice}</p>
      </section>
      <section className="past">
        <h3>Past tournaments</h3>
        {history.unavailable && <p>Progress won't be saved on this device.</p>}
        {history.items.length === 0 ? (
          <p>No past tournaments yet.</p>
        ) : (
          history.items.map((item, index) => (
            <details key={index}>
              <summary>
                Champion: {item.names[item.matches[item.matches.length - 1]?.winner ?? 0]}
              </summary>
              <Bracket tournament={item} />
              <button className="control" onClick={() => exportPast(item)}>
                Export tournament
              </button>
            </details>
          ))
        )}
      </section>
      {dialog && <ConfirmLeave keep={keep} leave={dialog} />}
    </>
  );
}
