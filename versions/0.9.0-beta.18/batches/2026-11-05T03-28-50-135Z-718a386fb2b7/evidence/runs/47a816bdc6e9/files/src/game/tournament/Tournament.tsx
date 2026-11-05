import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { Bracket } from './Bracket.tsx';
import { Setup } from './Setup.tsx';
import { currentPlayer, roundName } from './rules.ts';
import { useTournament } from './use-tournament.ts';
import './tournament.css';

export function Tournament({ back }: { back(): void }) {
  const {
    game,
    board,
    heading,
    dialog,
    keep,
    pending,
    count,
    setCount,
    names,
    setNames,
    event,
    setEvent,
    history,
    draft,
    setDraft,
    notice,
    setNotice,
    announcement,
    announce,
    confirm,
    start,
    startTurn,
    advance,
    exportEvent,
    load,
    match,
  } = useTournament();
  return (
    <section className="tournament">
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      {!event && (
        <Setup
          count={count}
          setCount={setCount}
          names={names}
          setNames={setNames}
          start={start}
          history={history}
          setEvent={setEvent}
          announce={announce}
          back={back}
        />
      )}
      {event && match && (
        <>
          <p>Round: {roundName(event.rounds.at(-1)!.length)}</p>
          {event.phase === 'complete' ? (
            <>
              <p>Champion: {event.names[match.winner!]}</p>
              <button className="control" onClick={back}>
                Back to game
              </button>
            </>
          ) : (
            <>
              <p>Now playing: {event.names[currentPlayer(event)]}</p>
              {event.phase === 'ready' && (
                <button className="control" onClick={startTurn}>
                  Start turn
                </button>
              )}
              {event.phase === 'playing' && game.session.paused && (
                <button className="control" onClick={game.resume}>
                  Resume
                </button>
              )}
              {event.phase === 'turn' && (
                <button className="control" onClick={advance}>
                  Next turn
                </button>
              )}
              {event.phase === 'match' && (
                <button className="control" onClick={advance}>
                  Next match
                </button>
              )}
              <button className="control" onClick={() => confirm(back)}>
                Leave tournament
              </button>
            </>
          )}
          {event.phase === 'playing' && (
            <>
              <GameStatus
                game={game.session.game}
                best={undefined}
                celebration={game.session.celebration}
              />
              <p id="board-help" className="help">
                Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or
                Space reveals a card.
              </p>
              <Board
                key={game.session.generation}
                game={game.session.game}
                activate={(index) => {
                  setNotice('');
                  game.activate(index);
                }}
                ref={board}
              />
            </>
          )}
          <Bracket tournament={event} />
        </>
      )}
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={`${announcement}-${game.session.announcement}`}>
            {notice || game.session.feedback}
          </span>
        </p>
      </div>
      <div className="tournament-exchange">
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div>
          <button className="control" onClick={exportEvent}>
            Export tournament
          </button>
          <button className="control" onClick={load}>
            Load tournament
          </button>
        </div>
      </div>
      <dialog
        ref={dialog}
        onCancel={() => {
          pending.current = null;
        }}
      >
        <p>Leave this unfinished tournament?</p>
        <button
          ref={keep}
          className="control"
          onClick={() => {
            pending.current = null;
            dialog.current?.close();
          }}
        >
          Keep playing
        </button>
        <button
          className="control"
          onClick={() => {
            dialog.current?.close();
            pending.current?.();
            pending.current = null;
          }}
        >
          Leave
        </button>
      </dialog>
    </section>
  );
}
