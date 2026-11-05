import { openingSeedPairs } from './layout.ts';
import type { Tournament, TournamentPlayer } from './model.ts';

function invalid(): never {
  throw new Error('Invalid tournament JSON.');
}

function samePlayer(first: TournamentPlayer | null, second: TournamentPlayer | null): boolean {
  return first?.name === second?.name && first?.seed === second?.seed;
}

export function validateTournamentBracket(tournament: Tournament): void {
  const { rounds } = tournament;
  const usedCodes = new Set<string>();
  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
    const round = rounds[roundIndex];
    if (!round) return invalid();
    for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex += 1) {
      const match = round.matches[matchIndex];
      if (!match || usedCodes.has(match.boardCode)) return invalid();
      usedCodes.add(match.boardCode);
      const expectedPlayers = expectedMatchPlayers(tournament, roundIndex, matchIndex);
      if (
        !samePlayer(match.players[0], expectedPlayers[0]) ||
        !samePlayer(match.players[1], expectedPlayers[1])
      )
        return invalid();
      const current = roundIndex === tournament.roundIndex && matchIndex === tournament.matchIndex;
      const earlier =
        roundIndex < tournament.roundIndex ||
        (roundIndex === tournament.roundIndex && matchIndex < tournament.matchIndex);
      if (earlier || (current && tournament.status === 'finished')) {
        if (!match.winner) return invalid();
      } else if (!current && match.winner) return invalid();
      if (!current && !match.winner && match.results.some(Boolean)) return invalid();
    }
  }
  const firstCode = rounds[0]?.matches[0]?.boardCode;
  if (tournament.id !== firstCode) return invalid();
  const currentRound = rounds[tournament.roundIndex];
  const current = currentRound?.matches[tournament.matchIndex];
  if (!current) return invalid();
  if (tournament.status === 'active') {
    if (tournament.champion) return invalid();
    if (tournament.playerIndex === 1 && !current.results[0]) return invalid();
    if (tournament.playerIndex === 0 && current.results[1]) return invalid();
    if (current.winner && tournament.playerIndex !== 1) return invalid();
    if (
      current.winner &&
      tournament.roundIndex === rounds.length - 1 &&
      tournament.matchIndex === (currentRound?.matches.length ?? 0) - 1
    )
      return invalid();
  } else {
    const lastRound = rounds.length - 1;
    const finalMatch = rounds[lastRound]?.matches.at(-1);
    if (
      tournament.roundIndex !== lastRound ||
      tournament.matchIndex !== (currentRound?.matches.length ?? 0) - 1 ||
      tournament.playerIndex !== 1 ||
      !finalMatch?.winner ||
      !samePlayer(tournament.champion, finalMatch.winner) ||
      rounds.some((round) => round.matches.some((match) => !match.winner))
    )
      return invalid();
  }
}

function expectedMatchPlayers(
  tournament: Tournament,
  roundIndex: number,
  matchIndex: number,
): readonly [TournamentPlayer | null, TournamentPlayer | null] {
  if (roundIndex === 0) {
    const pair = openingSeedPairs(tournament.playerCount)[matchIndex];
    if (!pair) return [null, null];
    return [tournament.players[pair[0]] ?? null, tournament.players[pair[1]] ?? null];
  }
  if (roundIndex > tournament.roundIndex) return [null, null];
  const previous = tournament.rounds[roundIndex - 1];
  return [
    previous?.matches[matchIndex * 2]?.winner ?? null,
    previous?.matches[matchIndex * 2 + 1]?.winner ?? null,
  ];
}
