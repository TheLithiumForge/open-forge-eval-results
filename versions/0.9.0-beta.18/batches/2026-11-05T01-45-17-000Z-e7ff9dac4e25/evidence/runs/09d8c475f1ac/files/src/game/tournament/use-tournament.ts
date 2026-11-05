import { useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { activateSession } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import { dealCodes } from './deals.ts';
import { decodeTournament, encodeTournament, TournamentNotice } from './format.ts';
import { nameProblem, normalizeName } from './names.ts';
import { createTournament, dealSizes, nextTurn, recordResult } from './rules.ts';
import { IDLE, resultOf, turnSession, viewOf } from './turn.ts';
import type { Session } from '../session/session.ts';
import type { Tournament, Turn } from './rules.ts';

const MAX_PLAYERS = 8;
const blanks = (): string[] => Array.from({ length: MAX_PLAYERS }, () => '');

// The tournament screen's state. The clock, the turn's game and the results stay here, apart from
// the solo session. Only a finished tournament leaves, through save.
export function useTournament(save: (finished: Tournament) => void) {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(blanks);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [session, setSession] = useState<Session>(IDLE);
  const [result, setResult] = useState({ feedback: '', announcement: 0 });
  const tournamentRef = useRef<Tournament | null>(null);
  const turnRef = useRef<Turn | null>(null);
  const current = useRef(session);
  const generations = useRef(0);

  function commit(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit);

  function publish(feedback: string): void {
    setResult((previous) => ({ feedback, announcement: previous.announcement + 1 }));
  }

  // Moving to another turn or screen clears the last result without announcing it.
  function arrange(next: Tournament | null, onScreen: Turn | null, game: Session = IDLE): void {
    tournamentRef.current = next;
    turnRef.current = onScreen;
    setTournament(next);
    setTurn(onScreen);
    clock.reset();
    commit(game);
    setResult((previous) => ({ ...previous, feedback: '' }));
  }

  function start(): boolean {
    const entered = names.slice(0, count);
    const problem = nameProblem(entered);
    if (problem) {
      publish(problem);
      return false;
    }
    arrange(createTournament(entered.map(normalizeName), dealCodes(dealSizes(count))), null);
    return true;
  }

  function startTurn(): void {
    const next = tournamentRef.current && nextTurn(tournamentRef.current);
    const match = next && tournamentRef.current?.matches[next.match];
    if (!next || !match) return;
    generations.current += 1;
    arrange(tournamentRef.current, next, turnSession(match.code, generations.current));
  }

  function activate(index: number): void {
    const running = tournamentRef.current;
    const played = turnRef.current;
    if (!running || !played) return;
    clock.synchronize();
    const before = current.current;
    const after = activateSession(before, index);
    commit(after);
    if (after.announcement !== before.announcement) publish(after.feedback);
    if (isWon(before.game) || !isWon(after.game)) return;
    const updated = recordResult(running, played, resultOf(after.game));
    tournamentRef.current = updated;
    setTournament(updated);
    if (nextTurn(updated) === null) save(updated);
  }

  function load(text: string): boolean {
    const decoded = decodeTournament(text);
    if (!decoded.ok) {
      publish(decoded.notice);
      return false;
    }
    const loaded = decoded.tournament;
    if (loaded.matches.length === 0) {
      setCount(loaded.players.length);
      setNames(blanks().map((_, index) => loaded.players[index] ?? ''));
    }
    arrange(loaded.matches.length === 0 ? null : loaded, null);
    publish(TournamentNotice.loaded);
    return true;
  }

  // Export takes the tournament on screen, or the entry form while none has started.
  function exportJson(): string {
    const draft = { players: names.slice(0, count).map(normalizeName), matches: [] };
    return encodeTournament(tournamentRef.current ?? draft);
  }

  return {
    count,
    names,
    setCount,
    rename: (index: number, name: string) =>
      setNames((previous) => previous.map((old, at) => (at === index ? name : old))),
    tournament,
    session,
    result,
    view: viewOf(tournament, turn, session.game),
    start,
    startTurn,
    advance: () => arrange(tournamentRef.current, null),
    leave: () => arrange(null, null),
    activate,
    load,
    exportJson,
  };
}
