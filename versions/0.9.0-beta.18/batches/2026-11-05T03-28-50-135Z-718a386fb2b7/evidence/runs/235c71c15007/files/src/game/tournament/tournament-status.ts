import { formatElapsed } from '../elapsed-time.ts';
import { currentMatch } from './tournament.ts';
import type { Tournament, TournamentPlayer, TournamentPosition, TournamentResult } from './tournament.ts';

export interface TournamentFeedback {
  readonly key: string;
  readonly number: number;
  readonly text: string;
}

export interface TournamentNotice {
  readonly message: string;
  readonly number: number;
}

export function tournamentStatusText(
  tournament: Tournament | null,
  player: TournamentPlayer | null,
  match: ReturnType<typeof currentMatch>,
  current: TournamentPosition | null,
  result: TournamentResult | null,
  feedback: TournamentFeedback,
  turnKey: string,
  notice: string,
): string {
  let base = '';
  if (tournament?.status === 'complete' && tournament.champion) {
    const final = tournament.rounds.at(-1)?.matches[0];
    const championIndex = final?.players.findIndex((entrant) => entrant?.seed === tournament.champion?.seed) ?? -1;
    const championResult = final?.results[championIndex];
    base = championResult
      ? `Champion: ${tournament.champion.name}. ${championResult.moves} moves in ${formatElapsed(championResult.elapsedMs)}.`
      : `Champion: ${tournament.champion.name}.`;
  } else if (player && result) {
    const finished = `${player.name} finished with ${result.moves} moves in ${formatElapsed(result.elapsedMs)}.`;
    base = match?.winner
      ? `${finished} Match winner: ${match.winner.name}.`
      : `${finished} Select ${current?.turn === 0 ? 'Next turn' : 'Next match'}.`;
  } else if (player) {
    base = `Now playing: ${player.name}${feedback.key === turnKey && feedback.text ? `. ${feedback.text}` : ''}`;
  }
  if (notice) return base ? `${notice} ${base}` : notice;
  return base;
}

export function tournamentStatusKey(
  tournament: Tournament | null,
  player: TournamentPlayer | null,
  match: ReturnType<typeof currentMatch>,
  current: TournamentPosition | null,
  result: TournamentResult | null,
  feedback: TournamentFeedback,
  turnKey: string,
  notice: TournamentNotice,
): string {
  if (notice.message) return `notice-${notice.number}-${turnKey}-${feedback.key === turnKey ? feedback.number : 0}`;
  if (tournament?.status === 'complete') return `champion-${tournament.champion?.seed ?? 0}`;
  if (match?.winner) return `match-${current?.round}-${current?.match}-winner`;
  if (result) return `finish-${current?.round}-${current?.match}-${current?.turn}`;
  return `${turnKey}-${feedback.key === turnKey ? feedback.number : 0}-${player?.seed ?? 0}`;
}
