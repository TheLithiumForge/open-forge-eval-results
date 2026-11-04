import type { GameSelection } from "./state.ts";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isIndex(value: unknown, count: number): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0 && value < count;
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

export function decodeSelection(value: unknown, count: number): GameSelection | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "closed" && hasExactKeys(value, ["kind"])) return { kind: "closed" };

  if (
    value.kind === "one" &&
    hasExactKeys(value, ["kind", "index"]) &&
    isIndex(value.index, count)
  ) {
    return { kind: "one", index: value.index };
  }

  if (
    value.kind === "mismatch" &&
    hasExactKeys(value, ["kind", "first", "second", "remainingMs"]) &&
    isIndex(value.first, count) &&
    isIndex(value.second, count) &&
    value.first !== value.second &&
    Number.isSafeInteger(value.remainingMs) &&
    typeof value.remainingMs === "number" &&
    value.remainingMs >= 1 &&
    value.remainingMs <= 800
  ) {
    return {
      kind: "mismatch",
      first: value.first,
      second: value.second,
      remainingMs: value.remainingMs,
    };
  }

  return null;
}

function hasWholeMatchedPairs(matched: readonly number[], deck: readonly number[]): boolean {
  const seen = new Set<number>();
  const counts = new Map<number, number>();
  for (const index of matched) {
    if (!isIndex(index, deck.length) || seen.has(index)) return false;
    seen.add(index);
    const face = deck[index];
    if (face === undefined) return false;
    counts.set(face, (counts.get(face) ?? 0) + 1);
  }
  return [...counts.values()].every((count) => count === 2);
}

export function decodeMatched(value: unknown, deck: readonly number[]): readonly number[] | null {
  if (!isUnknownArray(value)) return null;
  const indices: number[] = [];
  for (const index of value) {
    if (!isIndex(index, deck.length)) return null;
    indices.push(index);
  }
  return hasWholeMatchedPairs(indices, deck) ? Object.freeze(indices) : null;
}

export function selectionTouchesMatched(
  selection: GameSelection,
  matched: readonly number[],
): boolean {
  if (selection.kind === "closed") return false;
  if (selection.kind === "one") return matched.includes(selection.index);
  return matched.includes(selection.first) || matched.includes(selection.second);
}

export function selectionHasDifferentFaces(
  selection: GameSelection,
  deck: readonly number[],
): boolean {
  return selection.kind !== "mismatch" || deck[selection.first] !== deck[selection.second];
}

export function isConsistent(
  started: boolean,
  moves: number,
  elapsedMs: number,
  selection: GameSelection,
  pairs: number,
  cardCount: number,
): boolean {
  if (!started) {
    return moves === 0 && elapsedMs === 0 && pairs === 0 && selection.kind === "closed";
  }
  if (selection.kind === "mismatch" && moves < pairs + 1) return false;
  if (moves < pairs) return false;
  if (moves === 0 && selection.kind !== "one") return false;
  if (pairs === cardCount / 2 && selection.kind !== "closed") return false;
  return true;
}
