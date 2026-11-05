import { useState } from 'react';
import { Game } from './game/Game.tsx';
import { TournamentScreen } from './game/tournament/TournamentScreen.tsx';

export function App() {
  const [tournamentSize, setTournamentSize] = useState<number | null>(null);
  return tournamentSize === null ? (
    <Game openTournament={setTournamentSize} />
  ) : (
    <TournamentScreen size={tournamentSize} exit={() => setTournamentSize(null)} />
  );
}
