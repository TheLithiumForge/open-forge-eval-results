import { useCallback, useState } from 'react';
import { SoloGame } from './SoloGame.tsx';
import { Tournament } from './tournament/Tournament.tsx';
import { useTournamentHistory } from './tournament/use-tournament-history.ts';
import './game.css';

export function Game() {
  const { history, remember } = useTournamentHistory();
  const [tournament, setTournament] = useState(false);
  const [returned, setReturned] = useState(false);
  const [message, setMessage] = useState({ text: '', event: 0 });
  const announce = useCallback((text: string) => {
    setMessage((previous) => ({ text, event: previous.event + 1 }));
  }, []);
  const status = (feedback: string, announcement: number) => (
    <div className="game-result">
      <p role="status" aria-live="polite" aria-atomic="true">
        <span key={announcement}>{feedback}</span>
      </p>
    </div>
  );
  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {tournament ? (
        <Tournament
          history={history}
          remember={remember}
          status={status(message.text, message.event)}
          announce={announce}
          back={() => {
            setTournament(false);
            setReturned(true);
            announce('');
          }}
        />
      ) : (
        <SoloGame
          status={status}
          focusHeading={returned}
          openTournament={() => {
            setTournament(true);
            announce('Tournament setup.');
          }}
        />
      )}
    </main>
  );
}
