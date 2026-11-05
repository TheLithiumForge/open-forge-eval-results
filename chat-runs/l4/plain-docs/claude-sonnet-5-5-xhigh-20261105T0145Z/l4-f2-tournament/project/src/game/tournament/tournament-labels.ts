export const TournamentControl = {
  heading: 'Tournament',
  players: 'Players',
  start: 'Start tournament',
  startTurn: 'Start turn',
  nextTurn: 'Next turn',
  nextMatch: 'Next match',
  leave: 'Leave tournament',
  back: 'Back to game',
  exportJson: 'Export tournament',
  loadJson: 'Load tournament',
  json: 'Tournament JSON',
  keepPlaying: 'Keep playing',
  confirmLeave: 'Leave',
} as const;

export const TournamentText = {
  intro:
    'Four or eight players share this device. In each match both players play the same deal, one after the other, and fewer moves wins.',
  leaveTitle: 'Leave this tournament?',
  leaveBody: "Its unfinished matches won't be saved. Export tournament keeps its progress.",
  bracket: 'Bracket',
  past: 'Past tournaments',
  noPast: 'No finished tournaments yet.',
  undecided: 'To be decided',
  pending: '—',
  winner: ' (winner)',
} as const;

export const TournamentNotice = {
  loaded: 'Loaded tournament. Select Start turn to continue.',
  loadedCompleted: 'Loaded completed tournament.',
  loadedPlayers: 'Loaded players.',
} as const;
