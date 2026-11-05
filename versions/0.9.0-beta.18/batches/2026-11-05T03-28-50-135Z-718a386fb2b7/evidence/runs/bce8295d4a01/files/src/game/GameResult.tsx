interface GameResultProps {
  readonly text: string;
  readonly sequence: number;
  readonly className?: string;
}

export function GameResult({ text, sequence, className }: GameResultProps) {
  return (
    <div className="game-result">
      <p className={className} role="status" aria-live="polite" aria-atomic="true">
        <span key={sequence}>{text}</span>
      </p>
    </div>
  );
}
