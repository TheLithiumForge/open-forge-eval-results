import { describe, expect, it } from "vitest";
import { GameSession } from "./session.ts";
import { PREFERENCES_KEY, type StorageLike } from "./storage.ts";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  public put(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function clockedSession(storage: StorageLike | null = null) {
  let now = 0;
  const session = new GameSession({ now: () => now, seedSource: () => 1, storage });
  return { session, setNow: (value: number) => { now = value; } };
}

function completeGame(session: GameSession): string {
  const deck = session.getSnapshot().game.board.deck;
  const firstPositions = new Map<number, number>();
  for (let index = 0; index < deck.length; index += 1) {
    const face = deck[index];
    if (face === undefined) continue;
    const first = firstPositions.get(face);
    if (first === undefined) firstPositions.set(face, index);
    else {
      session.activateCard(first);
      session.activateCard(index);
    }
  }
  return session.exportSnapshot();
}

describe("browser game session", () => {
  it("announces turns once, including repeated identical misses", () => {
    const { session, setNow } = clockedSession();
    session.activateCard(0);
    session.activateCard(0);
    expect(session.getSnapshot().game.moves).toBe(0);
    session.activateCard(11);
    expect(session.getSnapshot().announcement?.text).toBe("Pair found. 1 pair matched.");

    session.activateCard(1);
    session.activateCard(2);
    const firstMiss = session.getSnapshot().announcement;
    expect(firstMiss?.text).toBe("No match. Cards close after a short pause.");
    session.activateCard(3);
    expect(session.getSnapshot().game.moves).toBe(2);
    setNow(800);
    session.tick(800);
    session.activateCard(3);
    session.activateCard(4);
    expect(session.getSnapshot().announcement?.id).toBeGreaterThan(firstMiss?.id ?? 0);
    expect(session.getSnapshot().announcement?.text).toBe(firstMiss?.text);
  });

  it("retains fractional active time and pauses the mismatch across hidden time", () => {
    const { session } = clockedSession();
    session.activateCard(0);
    session.tick(0.4);
    session.setVisible(false, 0.4);
    session.tick(5000);
    session.setVisible(true, 5000);
    session.tick(5000.6);
    expect(session.getSnapshot().game.elapsedMs).toBe(1);

    session.activateCard(1);
    session.activateCard(2);
    session.tick(5400.6);
    expect(session.getSnapshot().game.selection).toMatchObject({ kind: "mismatch", remainingMs: 400 });
    session.setVisible(false, 5400.6);
    session.tick(20000);
    session.setVisible(true, 20000);
    session.tick(20399);
    expect(session.getSnapshot().game.selection).toMatchObject({ kind: "mismatch", remainingMs: 1 });
    session.tick(20400);
    expect(session.getSnapshot().game.selection.kind).toBe("closed");
  });

  it("pauses imported progress until Resume and preserves invalid drafts", () => {
    const source = clockedSession().session;
    source.activateCard(1);
    source.activateCard(2);
    source.tick(300);
    const snapshot = source.exportSnapshot();
    const { session, setNow } = clockedSession();
    session.loadSnapshot(snapshot);
    const imported = session.getSnapshot();
    expect(imported.paused).toBe(true);
    expect(imported.status).toBe("Loaded snapshot. Select Resume to continue.");
    session.activateCard(0);
    expect(session.getSnapshot().game).toBe(imported.game);

    session.loadSnapshot("{}");
    expect(session.getSnapshot().status).toBe("Invalid snapshot.");
    expect(session.getSnapshot().game).toBe(imported.game);
    session.resume();
    setNow(100);
    session.tick(100);
    expect(session.getSnapshot().game.elapsedMs).toBe(400);
    expect(session.getSnapshot().game.selection).toMatchObject({ kind: "mismatch", remainingMs: 400 });
  });

  it("records a capped move-count win and never scores a completed import", () => {
    const setup = clockedSession();
    const deck = setup.session.getSnapshot().game.board.deck;
    const faceToKeep = deck[0];
    if (faceToKeep === undefined) throw new Error("Documented test board has no first face.");
    const remaining = deck.flatMap((face, index) => face === faceToKeep ? [index] : []);
    const matched = deck.flatMap((face, index) => face === faceToKeep ? [] : [index]);
    const saved = JSON.stringify({
      version: 1,
      boardCode: "np1-4-1",
      matched,
      selection: { kind: "one", index: remaining[0] },
      moves: 999999,
      elapsedMs: 0,
      started: true,
    });
    setup.session.loadSnapshot(saved);
    setup.session.resume();
    const last = remaining[1];
    if (last === undefined) throw new Error("Test board face should occur twice.");
    setup.session.activateCard(last);
    expect(setup.session.getSnapshot().game.moves).toBe(999999);
    expect(setup.session.getSnapshot().won).toBe(true);
    expect(setup.session.getSnapshot().bestMoves).toBe(999999);

    const completed = completeGame(clockedSession().session);
    const storage = new MemoryStorage();
    storage.put(PREFERENCES_KEY, JSON.stringify({ size: 4, bestMoves: { "4": 1 } }));
    storage.put("unrelated", "kept");
    const target = new GameSession({ now: () => 0, storage });
    target.loadSnapshot(completed);
    expect(target.getSnapshot().won).toBe(true);
    expect(target.getSnapshot().celebrationId).toBe(0);
    expect(target.getSnapshot().bestMoves).toBe(1);
    expect(storage.getItem("unrelated")).toBe("kept");
  });

  it("persists a valid board size and catches storage failures", () => {
    const storage = new MemoryStorage();
    storage.put(PREFERENCES_KEY, JSON.stringify({ size: 8, bestMoves: { "8": 12, "4": 1.5 } }));
    storage.put("unrelated", "untouched");
    const session = new GameSession({ now: () => 0, storage, seedSource: () => 5 });
    expect(session.getSnapshot().size).toBe(8);
    expect(session.getSnapshot().bestMoves).toBe(12);
    session.loadBoard(" np1-6-9 ");
    expect(session.getSnapshot().game.board.code).toBe("np1-6-9");
    expect(session.getSnapshot().status).toBe("");
    session.loadBoard("invalid");
    expect(session.getSnapshot().game.board.code).toBe("np1-6-9");
    expect(session.getSnapshot().status).toBe("Invalid board code.");
    expect(storage.getItem("unrelated")).toBe("untouched");

    const failingStorage: StorageLike = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    };
    const playable = new GameSession({ now: () => 0, storage: failingStorage });
    playable.changeSize(6);
    expect(playable.getSnapshot().size).toBe(6);
    playable.activateCard(0);
    expect(playable.getSnapshot().game.started).toBe(true);
  });
});
