export const DealControl = {
  size: 'Grid size',
  newGame: 'New Game',
  tournament: 'Tournament',
  restart: 'Restart',
} as const;
export const TournamentControl = {
  players: 'Players',
  player: 'Player',
  setup: 'Set up a tournament',
  start: 'Start tournament',
  startTurn: 'Start turn',
  nextTurn: 'Next turn',
  nextMatch: 'Next match',
  leave: 'Leave tournament',
  backToGame: 'Back to game',
  bracket: 'Bracket',
  json: 'Tournament JSON',
  export: 'Export tournament',
  load: 'Load tournament',
  past: 'Past tournaments',
} as const;
export const ReproductionControl = {
  summary: 'Reproduce a game',
  board: 'Board code',
  loadBoard: 'Load board',
  snapshot: 'Snapshot JSON',
  exportSnapshot: 'Export snapshot',
  loadSnapshot: 'Load snapshot',
  resume: 'Resume',
} as const;
