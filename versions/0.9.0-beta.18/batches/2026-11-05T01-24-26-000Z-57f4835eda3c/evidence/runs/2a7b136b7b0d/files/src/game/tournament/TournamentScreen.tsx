import { useLayoutEffect, useRef, useState } from 'react';
import { PastTournaments } from './PastTournaments.tsx';
import { TournamentData } from './TournamentData.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentProgress } from './TournamentProgress.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { PLAYER_COUNTS } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import { useTournament } from './use-tournament.ts';
import type { ReactNode } from 'react';
import type { PastTournamentList } from './use-past-tournaments.ts';
import './tournament.css';

interface TournamentScreenProps {
  // The page's one live region, placed here between the round and the turn.
  result: ReactNode;
  announce(text: string): void;
  past: PastTournamentList;
  back(): void;
}

const MOST_PLAYERS = Math.max(...PLAYER_COUNTS);

export function TournamentScreen({ result, announce, past, back }: TournamentScreenProps) {
  const tournament = useTournament(announce, past.save);
  const { run } = tournament;
  const [count, setCount] = useState<number>(PLAYER_COUNTS[0]);
  const [drafts, setDrafts] = useState<readonly string[]>(() =>
    Array.from({ length: MOST_PLAYERS }, () => ''),
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const view = run ? 'play' : 'setup';
  // Opening the screen, starting or loading a tournament and leaving one each replace what the
  // main area shows, so focus moves to this screen's heading.
  useLayoutEffect(() => heading.current?.focus(), [view]);
  const names = drafts.slice(0, count);
  return (
    <section className="tournament" aria-labelledby="tournament-heading">
      <h2 id="tournament-heading" ref={heading} tabIndex={-1}>
        {TournamentControl.heading}
      </h2>
      {run ? (
        <TournamentProgress tournament={run.tournament} turn={run.turn} back={back} />
      ) : (
        <TournamentSetup
          count={count}
          drafts={drafts}
          setCount={setCount}
          setDraft={(index, draft) =>
            setDrafts((all) => all.map((value, other) => (other === index ? draft : value)))
          }
          start={() => tournament.start(names)}
          back={back}
        />
      )}
      {result}
      {run ? (
        <TournamentPlay
          run={run}
          announce={announce}
          finish={tournament.finish}
          next={tournament.next}
          leave={tournament.leave}
        />
      ) : (
        <PastTournaments records={past.records} saving={past.saving} />
      )}
      <TournamentData exportJson={() => tournament.exportJson(names)} loadJson={tournament.load} />
    </section>
  );
}
