import { describe, expect, it } from 'vitest';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard } from '../transitions.ts';
import { announce, replaceGame } from './sessionModel.ts';
import type { SessionModel } from './sessionModel.ts';

function initial(): SessionModel {
  const game = createGame('np1-4-1');
  if (!game) throw new Error('Invalid fixture');
  return { game, preferences: { size: 4, bests: { 4: 10 } }, dealRevision: 0,
    paused: false, celebrate: false, announcement: { id: 0, text: '' }, loadStatus: '' };
}

describe('session replacement', () => {
  it('invalidates deal callbacks and preserves bests even when restarting the same board', () => {
    const model = initial();
    const playing = { ...model, game: activateCard(model.game, 0), celebrate: true };
    const restarted = replaceGame(playing, model.game, false, '');
    expect(restarted.dealRevision).toBe(1);
    expect(restarted.game).toBe(model.game);
    expect(restarted.preferences.bests).toBe(model.preferences.bests);
    expect(restarted).toMatchObject({ paused: false, celebrate: false, loadStatus: '' });
  });

  it('loads unfinished state paused and publishes one numbered status', () => {
    const model = initial();
    const game = activateCard(model.game, 0);
    const text = 'Loaded snapshot. Select Resume to continue.';
    expect(replaceGame(model, game, true, text))
      .toMatchObject({ game, paused: true, loadStatus: text, announcement: { id: 1, text } });
  });

  it('keeps a completed import static and retains existing bests', () => {
    const model = initial();
    const game: GameState = { ...model.game, matched: Array.from({ length: 16 }, (_, i) => i),
      started: true, moves: 8 };
    const imported = replaceGame(model, game, false, 'Loaded completed snapshot.');
    expect(imported).toMatchObject({ game, paused: false, celebrate: false });
    expect(imported.preferences.bests[4]).toBe(10);
  });

  it('gives consecutive identical results distinct event identities', () => {
    const first = announce(initial(), 'No match. Cards close after a short pause.');
    const second = announce(first, first.announcement.text);
    expect(second.announcement.text).toBe(first.announcement.text);
    expect(second.announcement.id).toBe(first.announcement.id + 1);
  });
});
