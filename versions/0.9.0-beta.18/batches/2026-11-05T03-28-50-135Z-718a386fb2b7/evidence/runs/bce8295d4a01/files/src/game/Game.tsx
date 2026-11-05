import { useCallback, useEffect, useRef, useState } from 'react';
import { SoloGame } from './SoloGame.tsx';
import { TournamentScreen } from './tournament/TournamentScreen.tsx';
import './game.css';

export function Game() {
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const [status, setStatus] = useState({ text: '', sequence: 0 });
  const sequence = useRef(0);
  const tournamentButton = useRef<HTMLButtonElement>(null);
  const wasTournamentOpen = useRef(false);

  const announce = useCallback((text: string) => {
    sequence.current += 1;
    setStatus({ text, sequence: sequence.current });
  }, []);

  useEffect(() => {
    if (wasTournamentOpen.current && !tournamentOpen) tournamentButton.current?.focus();
    wasTournamentOpen.current = tournamentOpen;
  }, [tournamentOpen]);

  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <SoloGame
        active={!tournamentOpen}
        tournamentButtonRef={tournamentButton}
        openTournament={() => setTournamentOpen(true)}
      />
      {tournamentOpen && (
        <TournamentScreen
          status={status}
          announce={announce}
          onBack={() => setTournamentOpen(false)}
        />
      )}
    </main>
  );
}
