export const TournamentControl = {
  heading: 'Tournament',
  players: 'Players',
  start: 'Start tournament',
  back: 'Back to game',
  startTurn: 'Start turn',
  nextTurn: 'Next turn',
  nextMatch: 'Next match',
  leave: 'Leave tournament',
  keepPlaying: 'Keep playing',
  confirmLeave: 'Leave',
  json: 'Tournament JSON',
  exportTournament: 'Export tournament',
  loadTournament: 'Load tournament',
  bracket: 'Bracket',
  past: 'Past tournaments',
} as const;

export const BracketLabel = {
  match: 'Match',
  player: 'Player',
  moves: 'Moves',
  time: 'Time',
  winner: 'Winner',
  undecidedPlayer: 'To be decided',
  notPlayed: 'Not played',
  undecidedWinner: 'Not decided',
  champion: 'Champion',
  players: 'Players',
  noRecords: 'No finished tournaments yet.',
} as const;

export const TournamentNotice = {
  invalid: 'Invalid tournament.',
  loaded: 'Loaded tournament.',
  intro:
    'Four or eight players share this device. Both players in a match get the same deal, and fewer moves wins.',
  leave: "Leave this tournament? Its results so far won't be kept.",
  unsaved: "Progress won't be saved on this device.",
} as const;

export function playerLabel(index: number): string {
  return `Player ${index + 1}`;
}

export function nowPlaying(name: string): string {
  return `Now playing: ${name}`;
}

export function roundText(round: string): string {
  return `Round: ${round}`;
}

export function championText(name: string): string {
  return `Champion: ${name}`;
}

export function unknownFieldText(name: string): string {
  return `Unknown field: ${name}.`;
}

export function moveCount(moves: number): string {
  return `${moves} ${moves === 1 ? 'move' : 'moves'}`;
}
