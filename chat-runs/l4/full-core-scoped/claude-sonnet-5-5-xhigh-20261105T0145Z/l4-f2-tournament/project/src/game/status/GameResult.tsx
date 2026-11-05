interface GameResultProps {
  feedback: string;
  announcement: number;
  // Whose turn it is, for a tournament screen. The solo game has no turn owner.
  owner?: string | undefined;
  id?: string | undefined;
}

// The page's one live region. Turn results, load statuses and the turn owner all go through it.
export function GameResult({ feedback, announcement, owner, id }: GameResultProps) {
  return (
    <div className="game-result">
      <p id={id} role="status" aria-live="polite" aria-atomic="true">
        {owner !== undefined && (
          <>
            <span className="turn-owner">Now playing: {owner}</span>{' '}
          </>
        )}
        <span key={announcement}>{feedback}</span>
      </p>
    </div>
  );
}
