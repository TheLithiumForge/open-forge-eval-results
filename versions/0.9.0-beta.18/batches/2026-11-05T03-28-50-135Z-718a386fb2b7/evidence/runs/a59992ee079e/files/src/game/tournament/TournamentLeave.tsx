import { useEffect, useRef, useState } from 'react';

export function TournamentLeave({ onLeave }: { onLeave(): void }) {
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const keepPlaying = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirming || !dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    keepPlaying.current?.focus();
  }, [confirming]);

  function stay(): void {
    dialog.current?.close();
    setConfirming(false);
    trigger.current?.focus();
  }

  function leave(): void {
    dialog.current?.close();
    setConfirming(false);
    onLeave();
  }

  return (
    <>
      <button ref={trigger} type="button" className="control" onClick={() => setConfirming(true)}>
        Leave tournament
      </button>
      <dialog
        ref={dialog}
        className="tournament-confirmation"
        aria-labelledby="leave-tournament-title"
        aria-describedby="leave-tournament-description"
        onCancel={(event) => {
          event.preventDefault();
          stay();
        }}
      >
        <h3 id="leave-tournament-title">Leave this tournament?</h3>
        <p id="leave-tournament-description">
          Leaving stops the tournament. This unfinished tournament won't be added to Past
          tournaments.
        </p>
        <div className="tournament-actions">
          <button ref={keepPlaying} type="button" className="control" onClick={stay}>
            Keep playing
          </button>
          <button type="button" className="control" onClick={leave}>
            Leave
          </button>
        </div>
      </dialog>
    </>
  );
}
