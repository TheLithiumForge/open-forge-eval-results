import { parseBoardCode } from '../deck.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { acceptPlayerNames, createTournament, roundDefinitions, type Tournament, type TournamentPlayerCount } from './tournament.ts';

export type NewTournamentResult =
  | { readonly names: readonly string[]; readonly tournament: Tournament }
  | { readonly error: string };

export function newTournament(drafts: readonly string[], playerCount: TournamentPlayerCount): NewTournamentResult {
  const accepted = acceptPlayerNames(drafts, playerCount);
  if (!('names' in accepted)) return accepted;
  const sizes = roundDefinitions(playerCount).flatMap((round) =>
    Array.from({ length: round.matchCount }, () => round.size),
  );
  const boardCodes: string[] = [];
  const usedCodes = new Set<string>();
  let previousSeed: number | undefined;
  for (const size of sizes) {
    let code = freshBoardCode(size, previousSeed);
    while (usedCodes.has(code)) code = freshBoardCode(size, previousSeed);
    usedCodes.add(code);
    boardCodes.push(code);
    previousSeed = parseBoardCode(code)?.seed;
  }
  const tournament = createTournament(playerCount, accepted.names, boardCodes);
  return tournament ? { names: accepted.names, tournament } : { error: 'Could not start tournament.' };
}
