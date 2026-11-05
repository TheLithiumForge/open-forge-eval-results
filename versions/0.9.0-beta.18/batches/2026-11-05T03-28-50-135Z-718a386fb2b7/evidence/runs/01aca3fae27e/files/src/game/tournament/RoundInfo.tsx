import type { Tournament } from './model.ts';
export function RoundInfo({
  event,
  complete,
  turn,
}: {
  event: Tournament;
  complete: boolean;
  turn: number;
}) {
  const match = event.matches[event.index]!;
  const round =
    event.index < event.names.length / 2
      ? event.names.length === 8
        ? 'Quarterfinal'
        : 'Semifinal'
      : event.index < event.matches.length - 1
        ? 'Semifinal'
        : 'Final';
  return complete ? (
    <p className="champion">Champion: {event.names[match.winner!]}</p>
  ) : (
    <>
      <p>Round: {round}</p>
      <p>Now playing: {event.names[match.players[turn]!]}</p>
    </>
  );
}
