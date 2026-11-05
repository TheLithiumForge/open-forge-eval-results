interface GameResultProps {
  feedback: string;
  announcement: number;
}

// The one live region of a game. A new key repeats an identical result as its own event.
export function GameResult({ feedback, announcement }: GameResultProps) {
  return (
    <div className="game-result">
      <p role="status" aria-live="polite" aria-atomic="true">
        <span key={announcement}>{feedback}</span>
      </p>
    </div>
  );
}
