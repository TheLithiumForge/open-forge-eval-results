import { useState } from 'react';
import { Game } from './Game.tsx';
import { TournamentScreen } from './tournament/TournamentScreen.tsx';

type Screen =
  | { readonly kind: 'game'; readonly returned: boolean }
  | { readonly kind: 'tournament'; readonly size: number };

// Free play and a tournament each mount on their own, so leaving one stops its clock.
export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'game', returned: false });
  if (screen.kind === 'tournament')
    return (
      <TournamentScreen
        size={screen.size}
        leave={() => setScreen({ kind: 'game', returned: true })}
      />
    );
  return (
    <Game
      focusTournament={screen.returned}
      openTournament={(size) => setScreen({ kind: 'tournament', size })}
    />
  );
}
