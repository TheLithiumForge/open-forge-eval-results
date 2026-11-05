export const TournamentControl = {
  open: 'Tournament',
  players: 'Players',
  player: 'Player',
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
  title: 'Tournament',
  round: 'Round:',
  champion: 'Champion:',
  bracket: 'Bracket',
  past: 'Past tournaments',
  noPast: 'No finished tournaments yet.',
  unsaved: "Progress won't be saved on this device.",
  winner: '(winner)',
  leaveTitle: 'Leave the tournament?',
  leaveDetail: "Its results so far won't be kept.",
} as const;
