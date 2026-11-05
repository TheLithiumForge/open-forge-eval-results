import { useEffect, useRef } from 'react';
import { Board } from '../board/Board.tsx';
import { BoardHelp } from '../board/BoardHelp.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { Bracket } from './Bracket.tsx';
import { Screen, TurnPhase } from './flow.ts';
import { championOf, nameOf } from './rules.ts';
import { TournamentControl } from './tournament-labels.ts';
import { TournamentStorageNotice } from './storage.ts';
import type { BoardFocus } from '../board/Board.tsx';
import type { SavedTournaments } from './storage.ts';
import type { TournamentController } from './use-tournament.ts';
import '../controls/control.css';
import './tournament.css';

interface TurnPanelProps {
  controller: TournamentController;
  saved: SavedTournaments;
  askLeave(): void;
  back(): void;
}

// A match is two turns on one deal. Each turn is a game of its own, started with Start turn.
export function TurnPanel({ controller, saved, askLeave, back }: TurnPanelProps) {
  const { state, screen } = controller;
  const { session, tournament, phase, active } = state;
  const board = useRef<BoardFocus>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const advanced = useRef(false);
  const playing = phase === TurnPhase.playing;
  // The board starts with its remembered card focused, because Start turn leaves with its button.
  useEffect(() => {
    if (playing) board.current?.focusRemembered();
  }, [playing, session.generation]);
  // The next Start turn takes focus from the Next button that just went away.
  useEffect(() => {
    if (advanced.current && phase === TurnPhase.idle) startButton.current?.focus();
    advanced.current = false;
  }, [phase]);
  if (!tournament) return null;
  const finished = screen === Screen.finished;
  const nextLabel = active?.seat === 1 ? TournamentControl.nextMatch : TournamentControl.nextTurn;
  const champion = nameOf(tournament, championOf(tournament));
  return (
    <>
      {finished ? (
        <>
          <p className="champion">{`Champion: ${champion}`}</p>
          {!saved.available && <p className="storage-notice">{TournamentStorageNotice}</p>}
        </>
      ) : null}
      <div className="tournament-row">
        {phase === TurnPhase.idle && !finished && (
          <button
            ref={startButton}
            type="button"
            className="control"
            onClick={controller.startTurn}
          >
            {TournamentControl.startTurn}
          </button>
        )}
        {phase === TurnPhase.done && !finished && (
          <button
            type="button"
            className="control"
            onClick={() => {
              advanced.current = true;
              controller.nextPlayer();
            }}
          >
            {nextLabel}
          </button>
        )}
        {finished ? (
          <button type="button" className="control" onClick={back}>
            {TournamentControl.back}
          </button>
        ) : (
          <button type="button" className="control" onClick={askLeave}>
            {TournamentControl.leave}
          </button>
        )}
      </div>
      {phase !== TurnPhase.idle && (
        <>
          <GameStatus
            game={session.game}
            best={undefined}
            celebration={session.celebration}
            showBest={false}
          />
          <BoardHelp />
          <Board
            key={session.generation}
            game={session.game}
            activate={controller.activate}
            ref={board}
          />
        </>
      )}
      <Bracket tournament={tournament} />
    </>
  );
}
