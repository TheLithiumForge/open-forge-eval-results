import { useRef } from 'react';
import { TournamentControl, TournamentNotice } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface LeaveTournamentProps {
  leave(): void;
}

// Leaving unfinished work asks first. Keep playing takes focus, and Escape keeps playing too.
export function LeaveTournament({ leave }: LeaveTournamentProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        type="button"
        className="control"
        onClick={() => {
          dialog.current?.showModal();
          keep.current?.focus();
        }}
      >
        {TournamentControl.leave}
      </button>
      <dialog ref={dialog} className="leave-dialog" aria-labelledby="leave-question">
        <p id="leave-question">{TournamentNotice.leave}</p>
        <div className="tournament-actions">
          <button
            ref={keep}
            type="button"
            className="control"
            onClick={() => dialog.current?.close()}
          >
            {TournamentControl.keepPlaying}
          </button>
          <button
            type="button"
            className="control"
            onClick={() => {
              dialog.current?.close();
              leave();
            }}
          >
            {TournamentControl.confirmLeave}
          </button>
        </div>
      </dialog>
    </>
  );
}
