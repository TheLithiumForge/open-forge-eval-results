import { useEffect, useRef, useState } from 'react';

interface TournamentLeaveDialogProps {
  readonly visible: boolean;
  onLeave(): void;
}

export function TournamentLeaveDialog({ visible, onLeave }: TournamentLeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepPlaying = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      keepPlaying.current?.focus();
    }
  }, [open]);

  function continueTournament(): void {
    dialog.current?.close();
    setOpen(false);
  }

  function leaveTournament(): void {
    dialog.current?.close();
    setOpen(false);
    onLeave();
  }

  return (
    <>
      {visible && (
        <button type="button" className="control" onClick={() => setOpen(true)}>
          Leave tournament
        </button>
      )}
      <dialog
        ref={dialog}
        className="tournament-confirm"
        aria-labelledby="leave-tournament-heading"
        onCancel={() => setOpen(false)}
      >
        <h2 id="leave-tournament-heading">Leave tournament?</h2>
        <p>The current tournament will stop.</p>
        <div className="tournament-actions">
          <button
            ref={keepPlaying}
            type="button"
            className="control"
            onClick={continueTournament}
          >
            Keep playing
          </button>
          <button type="button" className="control" onClick={leaveTournament}>
            Leave
          </button>
        </div>
      </dialog>
    </>
  );
}
