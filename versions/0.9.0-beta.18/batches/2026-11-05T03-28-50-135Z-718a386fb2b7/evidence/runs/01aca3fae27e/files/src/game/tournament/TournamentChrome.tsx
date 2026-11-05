import { useLayoutEffect, useRef } from 'react';
export function TournamentHeader() {
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
    </>
  );
}
export function TournamentStatus({ announcement }: { announcement: { id: number; text: string } }) {
  return (
    <div className="game-result">
      <p role="status" aria-live="polite" aria-atomic="true">
        <span key={announcement.id}>{announcement.text}</span>
      </p>
    </div>
  );
}
