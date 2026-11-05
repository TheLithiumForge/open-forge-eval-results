export const TournamentControl = {
  heading: 'Tournament',
  players: 'Players',
  start: 'Start tournament',
  startTurn: 'Start turn',
  nextTurn: 'Next turn',
  nextMatch: 'Next match',
  leave: 'Leave tournament',
  back: 'Back to game',
  exportTournament: 'Export tournament',
  loadTournament: 'Load tournament',
  json: 'Tournament JSON',
} as const;

export const LeaveDialogControl = {
  question: 'Leave the tournament? Unfinished results are lost.',
  keep: 'Keep playing',
  leave: 'Leave',
} as const;

export const PastLabel = {
  heading: 'Past tournaments',
  caption: 'Finished tournaments, newest first',
  empty: 'No finished tournaments yet.',
  columns: ['Champion', 'Runner-up', 'Players'],
} as const;

export const BracketColumn = ['Round', 'Match', 'Player', 'Moves', 'Time', 'Result'] as const;
