import { useEffect, useRef } from 'react';
import type { useTournament } from './use-tournament.ts';

type State = ReturnType<typeof useTournament>;
export function TournamentTools({ state }: { state: State }) {
  const {
    history,
    storageFailed,
    confirmLeave,
    setTournament,
    setNotice,
    draft,
    setDraft,
    exportTournament,
    loadTournament,
    pending,
    setPending,
  } = state;
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (pending) {
      dialog.current?.showModal();
      keep.current?.focus();
    }
  }, [pending]);
  return (
    <>
      <section className="tournament-section">
        <h3>Past tournaments</h3>
        {storageFailed && <p>Progress won't be saved on this device.</p>}
        {history.length === 0 ? (
          <p>No past tournaments.</p>
        ) : (
          <ul>
            {history.map((item, i) => (
              <li key={i}>
                Champion: {item.names[item.matches[item.matches.length - 1]!.winner!]}{' '}
                <button
                  className="control"
                  type="button"
                  onClick={() =>
                    confirmLeave(() => {
                      setTournament(item);
                      setNotice('');
                    })
                  }
                >
                  View tournament
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="tournament-section exchange">
        <label htmlFor="tournament-json">Tournament JSON</label>
        <textarea
          id="tournament-json"
          className="control"
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          maxLength={262144}
          rows={6}
        />
        <div>
          <button className="control" type="button" onClick={exportTournament}>
            Export tournament
          </button>{' '}
          <button className="control" type="button" onClick={loadTournament}>
            Load tournament
          </button>
        </div>
      </section>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          dialog.current?.close();
          setPending(null);
        }}
      >
        <p>Leave this tournament?</p>
        <div>
          <button
            ref={keep}
            className="control"
            type="button"
            onClick={() => {
              dialog.current?.close();
              setPending(null);
            }}
          >
            Keep playing
          </button>{' '}
          <button
            className="control"
            type="button"
            onClick={() => {
              const action = pending;
              dialog.current?.close();
              setPending(null);
              action?.();
            }}
          >
            Leave
          </button>
        </div>
      </dialog>
    </>
  );
}
