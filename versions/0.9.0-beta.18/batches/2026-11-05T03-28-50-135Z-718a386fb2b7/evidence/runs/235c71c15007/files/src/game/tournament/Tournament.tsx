import { useLayoutEffect, useRef } from 'react';
import { TournamentScreen } from './TournamentScreen.tsx';
import { useTournament } from './use-tournament.ts';
import './tournament.css';
import '../controls/control.css';

interface TournamentProps {
  readonly onBack: () => void;
}

export function Tournament({ onBack }: TournamentProps) {
  const controller = useTournament(onBack);
  const heading = useRef<HTMLHeadingElement>(null);
  const champion = useRef<HTMLParagraphElement>(null);
  const previousStatus = useRef(controller.tournament?.status ?? null);

  useLayoutEffect(() => {
    heading.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (controller.tournament?.status === 'complete' && previousStatus.current !== 'complete')
      champion.current?.focus();
    previousStatus.current = controller.tournament?.status ?? null;
  }, [controller.tournament?.status]);

  return (
    <TournamentScreen
      championRef={champion}
      controller={controller}
      headingRef={heading}
      onBack={onBack}
    />
  );
}
