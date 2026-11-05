import { useLayoutEffect, useRef } from 'react';

export interface LeaveRequest {
  readonly proceed: () => void;
  readonly trigger: Element | null;
}
interface LeaveDialogProps {
  request: LeaveRequest | null;
  clear(): void;
}

export function LeaveDialog({ request, clear }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (request) {
      dialog.current?.showModal();
      keep.current?.focus();
    }
  }, [request]);
  function close(leaving: boolean): void {
    dialog.current?.close();
    clear();
    if (leaving) request?.proceed();
    else if (request?.trigger instanceof HTMLElement) request.trigger.focus();
  }
  return (
    <dialog
      ref={dialog}
      className="tournament-dialog"
      aria-labelledby="leave-title"
      onCancel={(event) => {
        event.preventDefault();
        close(false);
      }}
    >
      <h2 id="leave-title">Leave unfinished work?</h2>
      <p>Keep playing to continue, or leave this screen.</p>
      <div className="tournament-actions">
        <button ref={keep} type="button" className="control" onClick={() => close(false)}>
          Keep playing
        </button>
        <button type="button" className="control" onClick={() => close(true)}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
