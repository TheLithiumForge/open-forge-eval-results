export const TournamentControl = {
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
  keep: 'Keep playing',
  confirmLeave: 'Leave',
  past: 'Past tournaments',
} as const;

export function playerLabel(position: number): string {
  return `Player ${position}`;
}
