import { describe, expect, it } from "vitest";
import { createGame, SUPPORTED_SIZES } from "./board.ts";
import { MAX_ELAPSED_MS, MAX_MOVES } from "./constants.ts";
import { decodeSnapshot } from "./snapshot.ts";
import { activateCard, advanceGame, isWon } from "./transitions.ts";

const startingGame = () => createGame("np1-4-1");

describe("card transitions and active time", () => {
  it("ignores repeated selection until a different card is revealed", () => {
    const game = startingGame();
    if (!game) throw new Error("fixture board is valid");
    const one = activateCard(game, 0);
    expect(activateCard(one, 0)).toBe(one);
    expect(one.moves).toBe(0);
    const two = activateCard(one, 11);
    expect(two.moves).toBe(1);
    expect(two.matched).toEqual([0, 11]);
    expect(two.selection.kind).toBe("closed");
  });

  it("keeps a miss for 800 active milliseconds and blocks actions", () => {
    const game = startingGame();
    if (!game) throw new Error("fixture board is valid");
    const mismatch = activateCard(activateCard(game, 0), 1);
    expect(mismatch.selection).toEqual({ kind: "mismatch", first: 0, second: 1, remainingMs: 800 });
    expect(activateCard(mismatch, 11)).toBe(mismatch);
    const beforeClose = advanceGame(mismatch, 799);
    expect(beforeClose.elapsedMs).toBe(799);
    expect(beforeClose.selection).toMatchObject({ kind: "mismatch", remainingMs: 1 });
    const closed = advanceGame(beforeClose, 1);
    expect(closed.selection).toEqual({ kind: "closed" });
    expect(closed.elapsedMs).toBe(800);
  });

  it("starts timing on first reveal, caps moves, and stops at victory", () => {
    const game = startingGame();
    if (!game) throw new Error("fixture board is valid");
    expect(advanceGame(game, 500)).toBe(game);
    const capInput = JSON.stringify({ version: 1, boardCode: game.board.code, matched: [], selection: { kind: "one", index: 0 }, moves: MAX_MOVES, elapsedMs: 0, started: true });
    const capped = decodeSnapshot(capInput);
    if (!capped) throw new Error("fixture snapshot is valid");
    const match = activateCard(capped, 11);
    expect(match.moves).toBe(MAX_MOVES);
    const winningBoard = createGame("np1-4-1");
    if (!winningBoard) throw new Error("fixture board is valid");
    let won = winningBoard;
    for (let index = 0; index < won.board.deck.length; index += 1) {
      const mate = won.board.deck.findIndex((face, other) => face === won.board.deck[index] && other !== index);
      won = activateCard(activateCard(won, index), mate);
    }
    expect(isWon(won)).toBe(true);
    expect(advanceGame(won, 100)).toBe(won);
  });

  it("completes every supported size through ordinary card actions", () => {
    for (const size of SUPPORTED_SIZES) {
      const initial = createGame(`np1-${size}-1`);
      if (!initial) throw new Error("fixture board is valid");
      let state = initial;
      for (let index = 0; index < state.board.deck.length; index += 1) {
        if (state.matched.includes(index)) continue;
        const mate = state.board.deck.findIndex((face, other) => other !== index && face === state.board.deck[index]);
        state = activateCard(activateCard(state, index), mate);
      }
      expect(isWon(state)).toBe(true);
      expect(state.moves).toBe(size * size / 2);
    }
  });

  it("caps active time at the specified limit", () => {
    const game = startingGame();
    if (!game) throw new Error("fixture board is valid");
    const started = activateCard(game, 0);
    expect(advanceGame(started, MAX_ELAPSED_MS + 500).elapsedMs).toBe(MAX_ELAPSED_MS);
  });
});
