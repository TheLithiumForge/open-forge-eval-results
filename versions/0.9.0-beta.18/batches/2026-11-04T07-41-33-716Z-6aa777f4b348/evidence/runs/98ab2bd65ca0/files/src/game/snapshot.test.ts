import { describe, expect, it } from "vitest";
import { createGame } from "./create.ts";
import { activateCard } from "./transition.ts";
import { decodeSnapshot, encodeSnapshot } from "./snapshot.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsedRecord(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error("Expected an object.");
  return value;
}

function mismatchSnapshot(): string {
  const initial = createGame("np1-4-1");
  if (initial === null) throw new Error("Test board should be valid.");
  return encodeSnapshot(activateCard(activateCard(initial, 1), 2));
}

describe("version 1 snapshots", () => {
  it("round-trips a pending mismatch", () => {
    const source = mismatchSnapshot();
    const decoded = decodeSnapshot(source);
    expect(decoded).not.toBeNull();
    if (decoded !== null) expect(encodeSnapshot(decoded)).toBe(source);
  });

  it("rejects unknown keys, malformed selection and same-face mismatch", () => {
    const source = parsedRecord(mismatchSnapshot());
    expect(decodeSnapshot(JSON.stringify({ ...source, extra: true }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...source, selection: { kind: "closed", extra: 0 } }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({
      ...source,
      selection: { kind: "mismatch", first: 0, second: 11, remainingMs: 1 },
    }))).toBeNull();
  });

  it("rejects partial matched pairs, duplicate indices and completed selections", () => {
    const source = parsedRecord(mismatchSnapshot());
    expect(decodeSnapshot(JSON.stringify({ ...source, matched: [0] }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...source, matched: [0, 11, 0] }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...source, matched: Array.from({ length: 16 }, (_, index) => index) }))).toBeNull();
  });

  it("enforces UTF-8 byte limits and safe move/time fields", () => {
    expect(decodeSnapshot(`${mismatchSnapshot()} ${" ".repeat(65536)}`)).toBeNull();
    const source = parsedRecord(mismatchSnapshot());
    expect(decodeSnapshot(JSON.stringify({ ...source, moves: 1000000 }))).toBeNull();
    expect(decodeSnapshot(JSON.stringify({ ...source, elapsedMs: Number.MAX_SAFE_INTEGER }))).toBeNull();
  });

  it("accepts specified state constraints without requiring earlier history", () => {
    const snapshot = {
      version: 1,
      boardCode: "np1-4-1",
      matched: [0, 11],
      selection: { kind: "closed" },
      moves: 1,
      elapsedMs: 0,
      started: true,
    };
    expect(decodeSnapshot(JSON.stringify(snapshot))).not.toBeNull();
  });
});
