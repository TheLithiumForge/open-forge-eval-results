import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import './tournament.css';

interface TournamentLeaveDialogProps {
  open: boolean;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  keepPlaying(): void;
  leave(): void;
}

export function TournamentLeaveDialog({
  open,
  returnFocusRef,
  keepPlaying,
  leave,
}: TournamentLeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepPlayingButton = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      keepPlayingButton.current?.focus();
    } else if (!open && element.open) {
      element.close();
      returnFocusRef.current?.focus();
    }
  }, [open, returnFocusRef]);

  return (
    <dialog
      ref={dialog}
      className="tournament-leave-dialog"
      aria-labelledby="tournament-leave-heading"
      aria-describedby="tournament-leave-description"
      onCancel={(event) => {
        event.preventDefault();
        keepPlaying();
      }}
    >
      <h2 id="tournament-leave-heading">Leave tournament?</h2>
      <p id="tournament-leave-description">Your current tournament work will be lost.</p>
      <div className="tournament-leave-actions">
        <button ref={keepPlayingButton} type="button" className="control" onClick={keepPlaying}>
          Keep playing
        </button>
        <button type="button" className="control" onClick={leave}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
