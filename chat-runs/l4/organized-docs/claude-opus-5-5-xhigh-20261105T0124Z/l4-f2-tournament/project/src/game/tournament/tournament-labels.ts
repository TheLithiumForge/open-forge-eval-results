export const TournamentControl = {
  heading: 'Tournament',
  players: 'Players',
  player: 'Player',
  start: 'Start tournament',
  startTurn: 'Start turn',
  nextTurn: 'Next turn',
  nextMatch: 'Next match',
  leave: 'Leave tournament',
  back: 'Back to game',
  json: 'Tournament JSON',
  exportTournament: 'Export tournament',
  loadTournament: 'Load tournament',
} as const;

export const TournamentText = {
  bracket: 'Bracket',
  past: 'Past tournaments',
  noRecords: 'No finished tournaments yet.',
  unsaved: "Progress won't be saved on this device.",
  undecided: 'To be decided',
  unplayed: '–',
} as const;

export const TournamentColumn = {
  round: 'Round',
  player: 'Player',
  moves: 'Moves',
  time: 'Time',
  winner: 'Winner',
  champion: 'Champion',
  runnerUp: 'Runner-up',
  players: 'Players',
} as const;

export const LeaveQuestion = {
  game: "Leave this game? Unfinished games aren't saved.",
  tournament: "Leave the tournament? Unfinished tournaments aren't saved.",
  keep: 'Keep playing',
  leave: 'Leave',
} as const;

export function nowPlaying(name: string): string {
  return `Now playing: ${name}`;
}

export function championText(name: string): string {
  return `Champion: ${name}`;
}

export function roundText(name: string): string {
  return `Round: ${name}`;
}

export function movesText(moves: number): string {
  return moves === 1 ? '1 move' : `${moves} moves`;
}
