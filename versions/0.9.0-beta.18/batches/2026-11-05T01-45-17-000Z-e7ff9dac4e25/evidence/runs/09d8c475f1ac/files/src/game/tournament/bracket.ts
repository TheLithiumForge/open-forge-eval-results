import { formatElapsed } from '../elapsed-time.ts';
import { matchInfo, matchPlayers, matchWinner, Round } from './rules.ts';
import type { Tournament } from './rules.ts';

interface BracketRow {
  readonly key: string;
  readonly match: string;
  readonly player: string;
  readonly moves: string;
  readonly time: string;
  readonly winner: boolean;
}

export const BRACKET_PENDING = '-';
export const BRACKET_UNDECIDED = 'To be decided';

// Two rows for each match: the first player to play, then the second.
export function bracketRows(tournament: Tournament): BracketRow[] {
  const count = tournament.players.length;
  return tournament.matches.flatMap((match, index) => {
    const info = matchInfo(count, index);
    const label =
      info?.round === Round.final ? Round.final : `${info?.round ?? ''} ${info?.number ?? ''}`;
    const winner = matchWinner(tournament, index);
    return matchPlayers(tournament, index).map((seed, slot) => {
      const result = match.results[slot] ?? null;
      return {
        key: `${index}-${slot}`,
        match: label,
        player: seed === null ? BRACKET_UNDECIDED : (tournament.players[seed] ?? ''),
        moves: result ? String(result.moves) : BRACKET_PENDING,
        time: result ? formatElapsed(result.elapsedMs) : BRACKET_PENDING,
        winner: seed !== null && seed === winner,
      };
    });
  });
}

// "Match 1 of 2: Ada vs Dev", with the names once both places are decided.
export function matchLine(tournament: Tournament, index: number): string {
  const info = matchInfo(tournament.players.length, index);
  const names = matchPlayers(tournament, index).map((seed) =>
    seed === null ? BRACKET_UNDECIDED : (tournament.players[seed] ?? ''),
  );
  return `Match ${info?.number ?? 0} of ${info?.width ?? 0}: ${names.join(' vs ')}`;
}

export function roundOf(tournament: Tournament, index: number): string {
  return matchInfo(tournament.players.length, index)?.round ?? '';
}
