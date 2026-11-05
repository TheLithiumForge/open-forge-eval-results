import { parseBoardCode } from '../deck.ts';
import type { RoundDefinition, Tournament, TournamentPlayer } from './model.ts';

export function roundDefinitions(playerCount: 4 | 8): readonly RoundDefinition[] {
  return playerCount === 4
    ? [
        { name: 'Semifinal', size: 6, count: 2 },
        { name: 'Final', size: 8, count: 1 },
      ]
    : [
        { name: 'Quarterfinal', size: 4, count: 4 },
        { name: 'Semifinal', size: 6, count: 2 },
        { name: 'Final', size: 8, count: 1 },
      ];
}

export function openingSeedPairs(playerCount: 4 | 8): readonly (readonly [number, number])[] {
  return playerCount === 4
    ? [
        [0, 3],
        [1, 2],
      ]
    : [
        [0, 7],
        [3, 4],
        [2, 5],
        [1, 6],
      ];
}

export function plannedMatchSizes(playerCount: 4 | 8): readonly number[] {
  return roundDefinitions(playerCount).flatMap(({ count, size }) =>
    Array.from({ length: count }, () => size),
  );
}

export function createTournament(
  names: readonly string[],
  playerCount: 4 | 8,
  codes: readonly string[],
): Tournament {
  if (names.length !== playerCount || codes.length !== plannedMatchSizes(playerCount).length)
    throw new Error('Tournament setup is incomplete.');
  const players = names.map((name, index) => ({ name, seed: index + 1 }));
  const sizes = plannedMatchSizes(playerCount);
  if (new Set(codes).size !== codes.length) throw new Error('Tournament deals must be unique.');
  for (let index = 0; index < codes.length; index += 1) {
    const parsed = parseBoardCode(codes[index] ?? '');
    if (!parsed || parsed.size !== sizes[index])
      throw new Error('Tournament deal has the wrong size.');
  }
  let codeIndex = 0;
  const rounds = roundDefinitions(playerCount).map((definition, roundIndex) => {
    const matches = Array.from({ length: definition.count }, (_, matchIndex) => {
      const boardCode = codes[codeIndex];
      codeIndex += 1;
      const prefix =
        definition.name === 'Quarterfinal' ? 'QF' : definition.name === 'Semifinal' ? 'SF' : 'F';
      const playersInMatch: readonly [TournamentPlayer | null, TournamentPlayer | null] =
        roundIndex === 0 ? openingPlayerPair(players, playerCount, matchIndex) : [null, null];
      if (!boardCode) throw new Error('Tournament deal is missing.');
      return {
        boardCode,
        id: `${prefix}${matchIndex + 1}`,
        players: playersInMatch,
        results: [null, null] as const,
        winner: null,
      };
    });
    return { matches, name: definition.name, size: definition.size };
  });
  const firstCode = rounds[0]?.matches[0]?.boardCode;
  if (!firstCode) throw new Error('Tournament has no opening match.');
  return {
    champion: null,
    id: firstCode,
    matchIndex: 0,
    playerCount,
    playerIndex: 0,
    players,
    roundIndex: 0,
    rounds,
    status: 'active',
  };
}

function openingPlayerPair(
  players: readonly TournamentPlayer[],
  playerCount: 4 | 8,
  matchIndex: number,
): readonly [TournamentPlayer | null, TournamentPlayer | null] {
  const pair = openingSeedPairs(playerCount)[matchIndex];
  if (!pair) throw new Error('Tournament pairing is missing.');
  return [players[pair[0]] ?? null, players[pair[1]] ?? null];
}
