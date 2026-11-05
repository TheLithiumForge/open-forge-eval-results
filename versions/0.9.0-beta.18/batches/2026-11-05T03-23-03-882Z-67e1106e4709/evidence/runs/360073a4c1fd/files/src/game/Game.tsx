import { useCallback, useState } from 'react';
import { SoloGame } from './SoloGame.tsx';
import { LeaveDialog } from './controls/LeaveDialog.tsx';
import { Tournament } from './tournament/Tournament.tsx';
import './game.css';

export function Game() {
  const [tournament, setTournament] = useState(false);
  const [visited, setVisited] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [message, setMessage] = useState({ text: '', event: 0 });
  const announce = useCallback((text: string) => {
    setMessage((previous) => ({ text, event: previous.event + 1 }));
  }, []);
  function confirm(action: () => void): void {
    setPending(() => action);
  }
  function openTournament(unfinished: boolean): void {
    const open = () => {
      announce('');
      setVisited(true);
      setTournament(true);
    };
    if (unfinished) confirm(open);
    else open();
  }
  const status = (
    <div className="game-result">
      <p role="status" aria-live="polite" aria-atomic="true">
        <span key={message.event}>{message.text}</span>
      </p>
    </div>
  );
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {!tournament && (
        <SoloGame status={status} focus={visited} announce={announce} tournament={openTournament} />
      )}
      <Tournament
        active={tournament}
        status={status}
        announce={announce}
        confirm={confirm}
        back={() => {
          announce('');
          setTournament(false);
        }}
      />
      <LeaveDialog action={pending} close={() => setPending(null)} />
    </main>
  );
}
