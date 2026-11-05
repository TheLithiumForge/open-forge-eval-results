export const TournamentControl = {
  open: 'Tournament',
  players: 'Players',
  start: 'Start tournament',
  back: 'Back to game',
  startTurn: 'Start turn',
  nextTurn: 'Next turn',
  nextMatch: 'Next match',
  leave: 'Leave tournament',
  json: 'Tournament JSON',
  exportTournament: 'Export tournament',
  loadTournament: 'Load tournament',
  keepPlaying: 'Keep playing',
  confirmLeave: 'Leave',
} as const;

export const TournamentText = {
  gameHeading: 'Game',
  heading: 'Tournament',
  intro:
    'Enter 4 or 8 players in seed order. Both players in a match play the same deal in turn. Fewer moves wins, then less time, then the higher seed.',
  past: 'Past tournaments',
  pastCaption: 'Finished tournaments, newest first',
  noPast: 'No finished tournaments yet.',
  unsaved: "Progress won't be saved on this device.",
  bracket: 'Bracket',
  undecided: 'To be decided',
  notPlayed: 'Not played',
  invalid: 'Invalid tournament.',
  loadedCompleted: 'Loaded completed tournament.',
  nothingToExport: 'No tournament to export.',
  leaveGame: 'Leave this game? Its progress will be lost.',
  leaveTournament: 'Leave this tournament? Its results so far will be lost.',
  replaceTournament: "Load another tournament? This tournament's results so far will be lost.",
} as const;

export const TournamentColumn = {
  match: 'Match',
  player: 'Player',
  moves: 'Moves',
  time: 'Time',
  winner: 'Winner',
  champion: 'Champion',
  players: 'Players',
} as const;

export function playerLabel(position: number): string {
  return `Player ${position}`;
}

export function nowPlaying(name: string): string {
  return `Now playing: ${name}`;
}

export function roundText(name: string): string {
  return `Round: ${name}`;
}

export function championText(name: string): string {
  return `Champion: ${name}`;
}

export function loadedText(name: string): string {
  return `Loaded tournament. ${nowPlaying(name)}.`;
}

export function unknownFieldText(field: string): string {
  return `Unknown field: ${field}.`;
}

export function movesText(moves: number): string {
  return `${moves} ${moves === 1 ? 'move' : 'moves'}`;
}
