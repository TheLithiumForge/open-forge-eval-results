import { Fragment } from 'react';
import { formatElapsed } from '../elapsed-time.ts';
import type { Tournament, TournamentMatch } from './rules.ts';
import './tournament.css';

interface BracketProps {
  tournament: Tournament;
  label?: string;
}

export function Bracket({ tournament, label = 'Tournament bracket' }: BracketProps) {
  return (
    <div className="tournament-table-wrap">
      <table className="tournament-bracket">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Match</th>
            <th scope="col">Player</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {tournament.matches.map((match, index) => (
            <Fragment key={`${match.round}-${match.number}`}>
              {matchRow(tournament, match, index, 0)}
              {matchRow(tournament, match, index, 1)}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function matchRow(tournament: Tournament, match: TournamentMatch, index: number, slot: 0 | 1) {
  const seed = match.playerSeeds[slot];
  const player = tournament.players.find((entrant) => entrant.seed === seed);
  const result = match.results[slot];
  const winner = tournament.players.find((entrant) => entrant.seed === match.winnerSeed);
  return (
    <tr key={`${index}-${slot}`}>
      {slot === 0 && (
        <>
          <th scope="rowgroup" rowSpan={2}>
            {match.round}
          </th>
          <th scope="row" rowSpan={2}>
            {match.number}
          </th>
        </>
      )}
      <th scope="row">{player ? `${player.seed}. ${player.name}` : 'To be determined'}</th>
      <td>{result?.moves ?? '—'}</td>
      <td>{result ? formatElapsed(result.elapsedMs) : '—'}</td>
      {slot === 0 && <td rowSpan={2}>{winner?.name ?? '—'}</td>}
    </tr>
  );
}
