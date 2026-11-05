export const TournamentControl = {
  heading: 'Tournament',
  players: 'Players',
  names: 'Names',
  player: 'Player',
  start: 'Start tournament',
  back: 'Back to game',
  startTurn: 'Start turn',
  nextTurn: 'Next turn',
  nextMatch: 'Next match',
  leave: 'Leave tournament',
  bracket: 'Bracket',
  moves: 'Moves',
  time: 'Time',
  past: 'Past tournaments',
  transfer: 'Save or load',
  json: 'Tournament JSON',
  exportTournament: 'Export tournament',
  loadTournament: 'Load tournament',
} as const;

export const TournamentNotice = {
  missingName: 'Enter a name for every player.',
  duplicateName: 'Give each player a different name.',
  loaded: 'Loaded tournament.',
  invalid: 'Invalid tournament.',
  noPast: 'No finished tournaments yet.',
  undecided: 'to be decided',
  unplayed: '–',
} as const;

const ROUND_NAMES = ['Final', 'Semifinals', 'Quarterfinals'] as const;

export function playerLabel(seat: number): string {
  return `${TournamentControl.player} ${seat + 1}`;
}

export function nowPlaying(name: string): string {
  return `Now playing: ${name}`;
}

export function championLine(name: string): string {
  return `Champion: ${name}`;
}

export function winnerLine(name: string | null): string {
  return `Winner: ${name ?? TournamentNotice.undecided}`;
}

// Rounds count back from the final, so 4 players start at the semifinals and 8 one round earlier.
export function roundName(roundsLeft: number): string {
  return ROUND_NAMES[roundsLeft - 1] ?? `Round of ${2 ** roundsLeft}`;
}

export function matchLabel(match: number): string {
  return `Match ${match + 1}`;
}

export function matchDetail(round: string, match: number, first: string, second: string): string {
  return `${round}, match ${match + 1}: ${first} vs ${second}. Both players get the same deal.`;
}

export function feederLabel(match: number): string {
  return `Winner of match ${match + 1}`;
}

export function turnOverNotice(name: string, next: string): string {
  return `${name}'s turn is over. ${next} plays the same deal next.`;
}

export function matchOverNotice(name: string, match: number): string {
  return `${name} wins match ${match + 1}.`;
}

export function dealNotice(size: number): string {
  return `Each match deals one ${size}x${size} board to both players. Fewer moves wins the match, and equal moves go to the faster time.`;
}
