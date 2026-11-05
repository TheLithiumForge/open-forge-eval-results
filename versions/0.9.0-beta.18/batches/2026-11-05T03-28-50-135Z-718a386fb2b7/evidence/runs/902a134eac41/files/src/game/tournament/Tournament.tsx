import { useRef, useState } from 'react';
import { browserStore } from '../session/use-saved-preferences.ts';
import { freshBoardCodes } from '../session/fresh-board.ts';
import { decodeTournament, encodeTournamentDraft } from './format.ts';
import { createTournament, tournamentBoardSizes, validatePlayerNames } from './rules.ts';
import { readPastTournaments, prependPastTournament, hasSavedPastTournaments } from './storage.ts';
import { PastTournaments } from './PastTournaments.tsx';
import { TournamentExchange } from './TournamentExchange.tsx';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentLeaveDialog } from './TournamentLeaveDialog.tsx';
import type { TournamentPlayHandle } from './TournamentPlay.tsx';
import type { TournamentPhase, TournamentRecord, TournamentState } from './model.ts';
import type { RefObject } from 'react';
import './tournament.css';

interface TournamentProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onLeave(): void;
}

export function Tournament({ headingRef, onLeave }: TournamentProps) {
  const [store] = useState(browserStore);
  const [past, setPast] = useState(() => readPastTournaments(store));
  const [playerCount, setPlayerCount] = useState<4 | 8>(4);
  const [names, setNames] = useState<readonly string[]>(Array.from({ length: 8 }, () => ''));
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [phase, setPhase] = useState<TournamentPhase | null>(null);
  const [instance, setInstance] = useState(0);
  const [json, setJson] = useState('');
  const [setupNotice, setSetupNotice] = useState('');
  const [exchangeNotice, setExchangeNotice] = useState('');
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const play = useRef<TournamentPlayHandle>(null);
  const leaveButton = useRef<HTMLButtonElement>(null);

  function requestLeave(): void {
    const hasDraft = names.some((name) => name.length > 0) || json.length > 0;
    if (phase === null && !hasDraft) onLeave();
    else setConfirmingLeave(true);
  }

  function saveRecord(record: TournamentRecord): boolean {
    const next = prependPastTournament(past, record);
    setPast(next);
    const saved = hasSavedPastTournaments(store, next);
    setExchangeNotice(saved ? 'Tournament saved.' : 'Tournament finished, but could not be saved.');
    return saved;
  }

  function start(): void {
    const validation = validatePlayerNames(names, playerCount);
    if (!validation.valid) {
      setSetupNotice(validation.message);
      return;
    }
    try {
      const codes = freshBoardCodes(tournamentBoardSizes(playerCount));
      const next = createTournament(validation.names, codes, Date.now());
      setNames(Array.from({ length: 8 }, (_, index) => validation.names[index] ?? ''));
      setTournament(next);
      setPhase(next.phase);
      setInstance((value) => value + 1);
      setSetupNotice('');
      setExchangeNotice('');
    } catch {
      setSetupNotice('Unable to create tournament deals. Please try again.');
    }
  }

  function setName(index: number, name: string): void {
    setNames((currentNames) =>
      currentNames.map((value, currentIndex) => (currentIndex === index ? name : value)),
    );
    setSetupNotice('');
  }

  function exportTournament(): void {
    const value = tournament
      ? play.current?.exportTournament()
      : encodeTournamentDraft({ playerCount, names: names.slice(0, playerCount) });
    if (value) {
      setJson(value);
      setExchangeNotice('Tournament exported to the JSON box.');
    }
  }

  function loadTournament(): void {
    const loaded = decodeTournament(json);
    if (!loaded) {
      setExchangeNotice('Invalid tournament JSON.');
      return;
    }
    setSetupNotice('');
    if (loaded.kind === 'setup') {
      setPlayerCount(loaded.draft.playerCount);
      setNames(Array.from({ length: 8 }, (_, index) => loaded.draft.names[index] ?? ''));
      setTournament(null);
      setPhase(null);
    } else {
      setTournament(loaded.tournament);
      setPhase(loaded.tournament.phase);
      setPlayerCount(loaded.tournament.players.length === 4 ? 4 : 8);
      setNames(
        Array.from({ length: 8 }, (_, index) => loaded.tournament.players[index]?.name ?? ''),
      );
      setInstance((value) => value + 1);
      if (loaded.kind === 'finished') {
        const saved = saveRecord(loaded.record);
        setExchangeNotice(
          saved ? 'Loaded finished tournament.' : 'Loaded tournament, but could not save it.',
        );
      }
    }
    if (loaded.kind !== 'finished') setExchangeNotice('Tournament loaded.');
  }

  return (
    <section className="tournament-screen" aria-labelledby="tournament-heading">
      <header className="tournament-header">
        <div>
          <h2 id="tournament-heading" ref={headingRef} tabIndex={-1}>
            Tournament
          </h2>
          <p className="intro">Take turns on the same deal. Fewer moves wins the match.</p>
        </div>
        {phase === 'finished' ? null : (
          <button ref={leaveButton} type="button" className="control" onClick={requestLeave}>
            Leave tournament
          </button>
        )}
      </header>
      {tournament ? (
        <TournamentPlay
          key={instance}
          ref={play}
          initial={tournament}
          onPhaseChange={setPhase}
          onFinished={saveRecord}
          onBack={onLeave}
        />
      ) : (
        <TournamentSetup
          playerCount={playerCount}
          names={names}
          notice={setupNotice}
          setPlayerCount={(count) => {
            setPlayerCount(count);
            setSetupNotice('');
          }}
          setName={setName}
          start={start}
        />
      )}
      <TournamentExchange
        value={json}
        notice={exchangeNotice}
        onChange={setJson}
        onExport={exportTournament}
        onLoad={loadTournament}
      />
      <PastTournaments records={past} />
      <TournamentLeaveDialog
        open={confirmingLeave}
        returnFocusRef={leaveButton}
        keepPlaying={() => setConfirmingLeave(false)}
        leave={onLeave}
      />
    </section>
  );
}
