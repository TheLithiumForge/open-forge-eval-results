export const TournamentControl = {
  heading: 'Tournament',
  players: 'Players',
  start: 'Start tournament',
  startTurn: 'Start turn',
  nextTurn: 'Next turn',
  nextMatch: 'Next match',
  leave: 'Leave tournament',
  back: 'Back to game',
  newTournament: 'New tournament',
  json: 'Tournament JSON',
  exportTournament: 'Export tournament',
  loadTournament: 'Load tournament',
  viewBracket: 'View bracket',
} as const;

export const TournamentText = {
  bracket: 'Bracket',
  past: 'Past tournaments',
  noPast: 'No finished tournaments yet.',
  transfer: 'Save or load',
  undecided: 'To be decided',
  rules:
    'Both players of a match play the same deal, one after the other. Fewer moves wins. A tie goes to the shorter time, then to the player listed first.',
} as const;

export const TournamentNotice = {
  loaded: 'Loaded tournament.',
  invalid: 'Invalid tournament.',
  exported: 'Exported tournament.',
  duplicate: 'Player names must be different.',
  left: 'Left the tournament.',
} as const;

export function playerLabel(position: number): string {
  return `Player ${position}`;
}

export function nowPlaying(name: string): string {
  return `Now playing: ${name}`;
}

export function championLine(name: string): string {
  return `Champion: ${name}`;
}

export function winnerLine(name: string | null): string {
  return `Winner: ${name ?? 'to be decided'}`;
}
