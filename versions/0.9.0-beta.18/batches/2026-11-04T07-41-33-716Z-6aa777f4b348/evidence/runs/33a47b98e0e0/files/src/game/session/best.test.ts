import { describe, expect, it } from 'vitest';
import { createGame } from '../state.ts';
import { GameSession } from './dealActions.ts';
import { FakeBrowser } from './testing.ts';

function nearWinSnapshot(): string {
  const game = createGame('np1-4-1');
  if (game === null) throw new Error('Literal game code must be valid');
  const matched: number[] = [];
  for (let face = 0; face < 7; face += 1) {
    matched.push(game.deck.indexOf(face), game.deck.lastIndexOf(face));
  }
  return JSON.stringify({
    version: 1, boardCode: game.board.boardCode, matched,
    selection: { kind: 'one', index: game.deck.indexOf(7) },
    moves: 7, elapsedMs: 1000, started: true,
  });
}

function solve(session: GameSession, browser: FakeBrowser, includeMiss: boolean): void {
  const game = createGame(session.getSnapshot().game.board.boardCode);
  if (game === null) throw new Error('Loaded deal must be valid');
  if (includeMiss) {
    session.activateCard(0);
    session.activateCard(1);
    browser.advanceBy(800);
  }
  for (let face = 0; face < game.deck.length / 2; face += 1) {
    session.activateCard(game.deck.indexOf(face));
    session.activateCard(game.deck.lastIndexOf(face));
  }
}

describe('best scores and imported snapshots', () => {
  it('records a win after Resume and keeps equal or worse later results', () => {
    const browser = new FakeBrowser();
    browser.storage.setItem('neon-pairs:best-scores:v1', JSON.stringify({ version: 1, scores: { 4: 9 } }));
    const session = new GameSession(browser);
    session.start();
    expect(session.loadSnapshot(nearWinSnapshot())).toBe(true);
    expect(session.getSnapshot().paused).toBe(true);
    session.resume();
    const one = session.getSnapshot().game.selection;
    if (one.kind !== 'one') throw new Error('The imported final card must be revealed');
    const fixture = createGame('np1-4-1');
    if (fixture === null) throw new Error('Literal game code must be valid');
    session.activateCard(fixture.deck.lastIndexOf(7));
    expect(session.getSnapshot().game.moves).toBe(8);
    expect(session.getSnapshot().best).toBe(8);
    expect(browser.storage.getItem('neon-pairs:best-scores:v1')).toContain('"4":8');

    session.restart();
    solve(session, browser, false);
    expect(session.getSnapshot().game.moves).toBe(8);
    expect(session.getSnapshot().best).toBe(8);
    session.restart();
    solve(session, browser, true);
    expect(session.getSnapshot().game.moves).toBe(9);
    expect(session.getSnapshot().best).toBe(8);
    expect(browser.storage.getItem('neon-pairs:best-scores:v1')).toContain('"4":8');
    session.stop();
  });

  it('does not record a completed imported game, even if its score would be better', () => {
    const browser = new FakeBrowser();
    browser.storage.setItem('neon-pairs:best-scores:v1', JSON.stringify({ version: 1, scores: { 6: 100 } }));
    const matched = Array.from({ length: 36 }, (_unused, index) => index);
    const completed = JSON.stringify({
      version: 1, boardCode: 'np1-6-3', matched, selection: { kind: 'closed' },
      moves: 18, elapsedMs: 500, started: true,
    });
    const session = new GameSession(browser);
    session.start();
    expect(session.loadSnapshot(completed)).toBe(true);
    expect(session.getSnapshot().best).toBe(100);
    expect(session.getSnapshot().paused).toBe(false);
    expect(session.getSnapshot().celebrating).toBe(false);
    expect(browser.storage.getItem('neon-pairs:best-scores:v1')).toContain('"6":100');
    session.stop();
  });
});
