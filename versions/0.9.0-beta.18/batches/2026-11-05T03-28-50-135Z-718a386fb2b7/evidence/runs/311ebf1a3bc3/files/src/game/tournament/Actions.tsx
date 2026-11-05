import type { TournamentData } from './rules.ts';

interface ActionsProps {
  t: TournamentData;
  setT(value: TournamentData | null): void;
  announce(text: string): void;
  back(): void;
  confirm(action: () => void): void;
}
export function Actions({ t, setT, announce, back, confirm }: ActionsProps) {
  const match = t.matches[t.index]!;
  const player = t.players[match.players[match.scores[0] ? 1 : 0]!];
  return (
    <div className="tournament-actions">
      {t.phase === 'ready' && (
        <button
          className="control"
          type="button"
          onClick={() => {
            setT({ ...t, phase: 'playing' });
            announce(`Now playing: ${player}`);
          }}
        >
          Start turn
        </button>
      )}
      {t.phase === 'turnDone' && (
        <button
          className="control"
          type="button"
          onClick={() => {
            setT({ ...t, phase: 'ready' });
            announce(`Now playing: ${t.players[match.players[1]!]}`);
          }}
        >
          Next turn
        </button>
      )}
      {t.phase === 'matchDone' && (
        <button
          className="control"
          type="button"
          onClick={() => {
            const next = t.matches[t.index + 1]!;
            setT({ ...t, index: t.index + 1, phase: 'ready' });
            announce(`Now playing: ${t.players[next.players[0]!]}`);
          }}
        >
          Next match
        </button>
      )}
      {t.phase === 'complete' ? (
        <>
          <button className="control" type="button" onClick={back}>
            Back to game
          </button>
          <button className="control" type="button" onClick={() => setT(null)}>
            Tournament screen
          </button>
        </>
      ) : (
        <button className="control" type="button" onClick={() => confirm(back)}>
          Leave tournament
        </button>
      )}
    </div>
  );
}
