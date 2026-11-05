import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { currentMatch, currentPlayer, nextMatch, roundName } from './tournament.ts';
import { Bracket } from './Bracket.tsx';
import { Setup } from './TournamentSetup.tsx';
import { useTournament } from './use-tournament.ts';
import './tournament.css';

export function Tournament({ back }: { back(): void }) {
  const c = useTournament();
  const { t, session } = c;
  return (
    <section className="tournament">
      <h2 ref={c.heading} tabIndex={-1}>
        Tournament
      </h2>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={c.notice || session.announcement}>
            {c.notice || (t?.phase === 'playing' ? session.feedback : '')}
          </span>
        </p>
      </div>
      {!t ? (
        <Setup
          count={c.count}
          setCount={c.setCount}
          names={c.names}
          setNames={c.setNames}
          start={c.start}
          back={back}
          history={c.history}
          select={(past) => {
            c.setTournament(past);
            c.setNotice('');
          }}
        />
      ) : (
        <>
          {t.phase === 'champion' ? (
            <>
              <p className="victory">Champion: {t.names[currentMatch(t).winner!]}</p>
              <button className="control" type="button" onClick={back}>
                Back to game
              </button>
              <button className="control" type="button" onClick={() => c.setTournament(null)}>
                Tournament screen
              </button>
            </>
          ) : (
            <>
              <p>Round: {roundName(t.rounds[t.round]!.length)}</p>
              <p>Now playing: {t.names[currentPlayer(t)]}</p>
              {(t.phase === 'ready' || (t.phase === 'playing' && session.paused)) && (
                <button className="control" type="button" onClick={c.startTurn}>
                  Start turn
                </button>
              )}
              {t.phase === 'turnDone' && (
                <button
                  className="control"
                  type="button"
                  onClick={() => {
                    c.setTournament({ ...t, phase: 'ready' });
                    c.setNotice(`Now playing: ${t.names[currentPlayer(t)]}`);
                  }}
                >
                  Next turn
                </button>
              )}
              {t.phase === 'matchDone' && (
                <button
                  className="control"
                  type="button"
                  onClick={() => {
                    const next = nextMatch(t);
                    c.setTournament(next);
                    c.setNotice(`Now playing: ${next.names[currentPlayer(next)]}`);
                  }}
                >
                  Next match
                </button>
              )}
              <button className="control" type="button" onClick={() => c.leave(back)}>
                Leave tournament
              </button>
              {t.phase === 'playing' && (
                <>
                  <GameStatus
                    game={session.game}
                    best={undefined}
                    celebration={session.celebration}
                  />
                  <p id="board-help" className="help">
                    Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or
                    Space reveals a card.
                  </p>
                  <Board
                    key={session.generation}
                    game={session.game}
                    activate={c.activate}
                    ref={c.board}
                  />
                </>
              )}
            </>
          )}
          <Bracket tournament={t} />
        </>
      )}
      <div className="tournament-exchange">
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          className="control"
          id="tournament-json"
          maxLength={65536}
          value={c.draft}
          onChange={(e) => c.setDraft(e.currentTarget.value)}
        />
        <div>
          <button className="control" type="button" onClick={c.exportCurrent}>
            Export tournament
          </button>
          <button className="control" type="button" onClick={c.load}>
            Load tournament
          </button>
        </div>
      </div>
      <dialog
        ref={c.dialog}
        onCancel={(e) => {
          e.preventDefault();
          c.dialog.current?.close();
          c.setConfirmAction(null);
        }}
      >
        <p>Leave the unfinished tournament?</p>
        <button
          className="control"
          ref={c.keep}
          type="button"
          onClick={() => {
            c.dialog.current?.close();
            c.setConfirmAction(null);
          }}
        >
          Keep playing
        </button>
        <button
          className="control"
          type="button"
          onClick={() => {
            const action = c.confirmAction;
            c.dialog.current?.close();
            c.setConfirmAction(null);
            action?.();
          }}
        >
          Leave
        </button>
      </dialog>
    </section>
  );
}
