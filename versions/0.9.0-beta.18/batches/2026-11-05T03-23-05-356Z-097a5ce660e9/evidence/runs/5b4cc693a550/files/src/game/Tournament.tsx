import { useEffect, useRef, useState } from 'react';
import { isWon } from './game.ts';
import { freshBoardCode } from './session/fresh-board.ts';
import { useGame } from './session/use-game.ts';
import { nameError, nextMatch, normalizeName, recordResult, roundFor } from './tournament.ts';
import type { TournamentState } from './tournament.ts';
import { readHistory, saveHistory, encode, decode } from './tournament-exchange.ts';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentShare } from './TournamentShare.tsx';
import { TournamentDialog } from './TournamentDialog.tsx';
import './tournament.css';

function fresh(t: TournamentState): string {
  const size = roundFor(t.names.length, t.matches.length).size;
  let code: string;
  do {
    code = freshBoardCode(size);
  } while (t.matches.some((match) => match.boardCode === code));
  return code;
}

export function Tournament({ back }: { back(): void }) {
  const controller = useGame(true);
  const [count, setCount] = useState(4);
  const [names, setNames] = useState<string[]>(Array(8).fill(''));
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeId, setNoticeId] = useState(0);
  const [history, setHistory] = useState(readHistory);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const pending = useRef<(() => void) | null>(null);
  const recorded = useRef(false);
  function publish(message: string) {
    setNotice(message);
    setNoticeId((id) => id + 1);
  }
  useEffect(() => {
    heading.current?.focus();
  }, [Boolean(tournament)]);
  const match = tournament?.matches.at(-1);
  const player = match?.results[0] ? 1 : 0;
  useEffect(() => {
    if (
      !tournament ||
      tournament.phase !== 'playing' ||
      !isWon(controller.session.game) ||
      recorded.current
    )
      return;
    recorded.current = true;
    const updated = recordResult(tournament, {
      moves: controller.session.game.moves,
      elapsedMs: controller.session.game.elapsedMs,
    });
    setTournament(updated);
    if (updated.phase === 'complete') {
      setHistory(saveHistory(history.items, updated));
    }
  }, [controller.session.game, tournament, history.items]);
  function askLeave(action: () => void) {
    if (tournament && tournament.phase !== 'complete') {
      pending.current = action;
      dialog.current?.showModal();
      keep.current?.focus();
    } else action();
  }
  function start() {
    const accepted = names.slice(0, count).map(normalizeName);
    const error = nameError(accepted);
    if (error) {
      publish(error);
      return;
    }
    const initial: TournamentState = { names: accepted, matches: [], phase: 'ready' };
    setTournament(nextMatch(initial, fresh(initial)));
    setNotice('');
  }
  function begin() {
    if (!match) return;
    recorded.current = false;
    controller.loadBoard(match.boardCode);
    setTournament((old) => (old ? { ...old, phase: 'playing' } : old));
    setNotice('');
  }
  function advance() {
    if (!tournament) return;
    if (tournament.phase === 'turnEnd') setTournament({ ...tournament, phase: 'ready' });
    else setTournament(nextMatch(tournament, fresh(tournament)));
    setNotice('');
  }
  function load() {
    try {
      const decoded = decode(json);
      const apply = () => {
        if (decoded.snapshot) controller.loadSnapshot(decoded.snapshot);
        if (decoded.tournament?.phase === 'complete')
          setHistory(saveHistory(history.items, decoded.tournament));
        recorded.current = false;
        setTournament(decoded.tournament);
        publish('Tournament loaded.');
      };
      askLeave(apply);
    } catch (error) {
      publish(
        error instanceof Error && error.message.startsWith('Unknown field:')
          ? error.message
          : 'Invalid tournament.',
      );
    }
  }
  const status =
    notice ||
    (tournament && match
      ? tournament.phase === 'complete'
        ? `Champion: ${tournament.names[match.winner!]}`
        : `Now playing: ${tournament.names[match.players[player]]}`
      : '');
  return (
    <main className="tournament">
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      <h2 ref={heading} tabIndex={-1}>
        Tournament
      </h2>
      <div className="game-result">
        <p role="status" aria-live="polite" aria-atomic="true">
          <span key={notice ? `notice-${noticeId}` : `game-${controller.session.announcement}`}>
            {notice ||
              (tournament?.phase === 'playing' && controller.session.feedback
                ? controller.session.feedback
                : status)}
          </span>
        </p>
      </div>
      {!tournament ? (
        <TournamentSetup
          count={count}
          setCount={setCount}
          names={names}
          setNames={setNames}
          start={start}
          history={history}
          back={back}
          notice={notice}
          open={(item) => {
            setTournament(item);
            setNotice('');
          }}
        />
      ) : (
        <TournamentPlay
          tournament={tournament}
          controller={controller}
          begin={begin}
          advance={advance}
          back={back}
          leave={() => askLeave(back)}
          clearNotice={() => setNotice('')}
        />
      )}
      <TournamentShare
        json={json}
        setJson={setJson}
        load={load}
        notice={notice}
        exportData={() => {
          setJson(
            encode(
              tournament,
              tournament?.phase === 'playing' ? controller.exportSnapshot() : null,
            ),
          );
          publish('Tournament exported.');
        }}
      />
      <TournamentDialog dialog={dialog} keep={keep} pending={pending} />
    </main>
  );
}
