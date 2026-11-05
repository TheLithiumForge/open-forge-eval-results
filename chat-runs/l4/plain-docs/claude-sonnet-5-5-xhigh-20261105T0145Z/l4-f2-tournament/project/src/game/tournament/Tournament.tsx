import { useEffect, useRef, useState } from 'react';
import { Board } from '../board/Board.tsx';
import { GameStatus } from '../status/GameStatus.tsx';
import { Bracket } from './Bracket.tsx';
import { LeaveDialog } from './LeaveDialog.tsx';
import { PastTournaments } from './PastTournaments.tsx';
import { SetupForm } from './SetupForm.tsx';
import { TournamentExchange } from './TournamentExchange.tsx';
import { checkNames } from './names.ts';
import { MAX_PLAYERS, PLAYER_COUNTS } from './rules.ts';
import { TournamentControl, TournamentText } from './tournament-labels.ts';
import { TurnPhase } from './view.ts';
import { useTournament } from './use-tournament.ts';
import type { ReactNode } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { Records } from './use-tournament-records.ts';
import '../controls/control.css';
import './tournament.css';

interface TournamentProps {
  records: Records;
  // The page's one live region, owned by Game. It is given the turn owner and the latest result.
  result(owner: string, feedback: string, announcement: number): ReactNode;
  back(): void;
}

const NO_NAMES: readonly string[] = Array.from({ length: MAX_PLAYERS }, () => '');

export function Tournament({ records, result, back }: TournamentProps) {
  const controller = useTournament(records);
  const { session, view } = controller;
  const [count, setCount] = useState<number>(PLAYER_COUNTS[0]);
  const [names, setNames] = useState(NO_NAMES);
  const [invalid, setInvalid] = useState<readonly number[]>([]);
  const [leaving, setLeaving] = useState(false);
  // Opening the screen, starting and leaving each replace what it shows, so focus lands on its h2.
  const [landing, setLanding] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const board = useRef<BoardFocus>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [landing]);
  // Start turn removes its own button, so focus follows to the board it opens.
  useEffect(() => {
    if (controller.active) board.current?.focusRemembered();
  }, [controller.active, session.generation]);

  function edit(next: readonly string[], size = count): void {
    setNames(next);
    setCount(size);
    setInvalid([]);
  }

  function start(): void {
    const checked = checkNames(names.slice(0, count));
    if (!checked.ok) {
      setInvalid(checked.fields);
      controller.notice(checked.error);
      return;
    }
    edit([...checked.names, ...names.slice(count)]);
    controller.startTournament(checked.names);
    setLanding(landing + 1);
  }

  function load(text: string): void {
    const players = controller.load(text);
    if (players) edit([...players, ...names.slice(players.length)], players.length);
  }

  function leave(): void {
    setLeaving(false);
    controller.leave();
    setLanding(landing + 1);
  }

  const { phase } = view;
  const playing = phase !== TurnPhase.setup && phase !== TurnPhase.complete;
  const primary =
    phase === TurnPhase.ready
      ? { label: TournamentControl.startTurn, run: controller.startTurn }
      : phase === TurnPhase.done
        ? {
            label: view.second ? TournamentControl.nextMatch : TournamentControl.nextTurn,
            run: controller.nextStep,
          }
        : undefined;
  return (
    <section className="tournament">
      <h2 ref={heading} tabIndex={-1} className="screen-title">
        {TournamentControl.heading}
      </h2>
      {phase === TurnPhase.setup && <p className="help">{TournamentText.intro}</p>}
      {view.round && <p>{view.round}</p>}
      {result(view.owner, session.feedback, session.announcement)}
      {phase === TurnPhase.setup && (
        <SetupForm
          count={count}
          names={names}
          invalid={invalid}
          setCount={(size) => edit(names, size)}
          setName={(index, name) => edit(names.map((old, at) => (at === index ? name : old)))}
          start={start}
        />
      )}
      {controller.active && (
        <>
          <GameStatus game={session.game} best={null} celebration={session.celebration} />
          <p id="board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <Board
            key={session.generation}
            game={session.game}
            activate={controller.activate}
            ref={board}
          />
        </>
      )}
      <div className="actions">
        {primary && (
          <button type="button" className="control" onClick={primary.run}>
            {primary.label}
          </button>
        )}
        {playing && (
          <button type="button" className="control" onClick={() => setLeaving(true)}>
            {TournamentControl.leave}
          </button>
        )}
        {!playing && (
          <button type="button" className="control" onClick={back}>
            {TournamentControl.back}
          </button>
        )}
      </div>
      {controller.tournament && <Bracket tournament={controller.tournament} />}
      <PastTournaments records={records} />
      <TournamentExchange
        exportText={() => controller.exportText(names.slice(0, count))}
        load={load}
      />
      <LeaveDialog open={leaving} keepPlaying={() => setLeaving(false)} leave={leave} />
    </section>
  );
}
