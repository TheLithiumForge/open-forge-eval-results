import { useEffect, useRef } from 'react';
import '../controls/control.css';

interface TournamentLeaveDialogProps {
  message: string;
  keepPlaying(): void;
  leave(): void;
}

export function TournamentLeaveDialog({ message, keepPlaying, leave }: TournamentLeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    keepButton.current?.focus();
    return () => {
      if (element.open) element.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="tournament-leave-dialog"
      aria-labelledby="tournament-leave-heading"
      onCancel={(event) => {
        event.preventDefault();
        keepPlaying();
      }}
    >
      <h3 id="tournament-leave-heading">Leave this tournament?</h3>
      <p>{message}</p>
      <div className="tournament-actions">
        <button ref={keepButton} className="control" type="button" onClick={keepPlaying}>
          Keep playing
        </button>
        <button className="control" type="button" onClick={leave}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
