import { ELAPSED_LIMIT_MS, MISMATCH_MS, MOVE_LIMIT, SNAPSHOT_LIMIT_BYTES, SNAPSHOT_VERSION, } from "./constants.js";
import { createGame, isWon } from "./state.js";
const SNAPSHOT_KEYS = [
    "version",
    "boardCode",
    "matched",
    "selection",
    "moves",
    "elapsedMs",
    "started",
];
export function encodeSnapshot(state) {
    return JSON.stringify({
        version: SNAPSHOT_VERSION,
        boardCode: state.board.boardCode,
        matched: state.matched,
        selection: state.selection,
        moves: state.moves,
        elapsedMs: state.elapsedMs,
        started: state.started,
    }, null, 2);
}
export function decodeSnapshot(text) {
    if (utf8Length(text) > SNAPSHOT_LIMIT_BYTES)
        return null;
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        return null;
    }
    if (!hasExactKeys(value, SNAPSHOT_KEYS))
        return null;
    if (value.version !== SNAPSHOT_VERSION || typeof value.boardCode !== "string")
        return null;
    const state = createGame(value.boardCode);
    if (state === null || !Array.isArray(value.matched))
        return null;
    if (!isSafeCount(value.moves, MOVE_LIMIT) || !isSafeCount(value.elapsedMs, ELAPSED_LIMIT_MS)) {
        return null;
    }
    if (typeof value.started !== "boolean")
        return null;
    const matched = validateMatched(value.matched, state);
    if (matched === null)
        return null;
    const selection = validateSelection(value.selection, state, matched);
    if (selection === null)
        return null;
    const pairCount = matched.length / 2;
    if (value.moves < pairCount)
        return null;
    if (selection.kind === "mismatch" && value.moves < pairCount + 1)
        return null;
    const restored = {
        ...state,
        matched,
        selection,
        moves: value.moves,
        elapsedMs: value.elapsedMs,
        started: value.started,
    };
    if (!value.started) {
        if (value.moves !== 0 || value.elapsedMs !== 0 || matched.length > 0)
            return null;
        if (selection.kind !== "closed")
            return null;
    }
    else if (value.moves === 0 && selection.kind !== "one") {
        return null;
    }
    if (isWon(restored) && selection.kind !== "closed")
        return null;
    return restored;
}
function validateMatched(raw, state) {
    const positions = new Set();
    const counts = new Map();
    for (const value of raw) {
        if (!isSafeCount(value, state.board.deck.length - 1) || positions.has(value))
            return null;
        const face = state.board.deck[value];
        if (face === undefined)
            return null;
        positions.add(value);
        counts.set(face, (counts.get(face) ?? 0) + 1);
    }
    if ([...counts.values()].some((count) => count !== 2))
        return null;
    return [...positions];
}
function validateSelection(raw, state, matched) {
    const occupied = new Set(matched);
    if (isRecord(raw) && hasExactKeys(raw, ["kind"]) && raw.kind === "closed") {
        return { kind: "closed" };
    }
    if (isRecord(raw) && hasExactKeys(raw, ["kind", "index"]) && raw.kind === "one") {
        if (!isPosition(raw.index, state, occupied))
            return null;
        return { kind: "one", index: raw.index };
    }
    if (isRecord(raw) &&
        hasExactKeys(raw, ["kind", "first", "second", "remainingMs"]) &&
        raw.kind === "mismatch") {
        if (!isPosition(raw.first, state, occupied) || !isPosition(raw.second, state, occupied)) {
            return null;
        }
        if (raw.first === raw.second ||
            !isSafeCount(raw.remainingMs, MISMATCH_MS) ||
            raw.remainingMs < 1) {
            return null;
        }
        if (state.board.deck[raw.first] === state.board.deck[raw.second])
            return null;
        return {
            kind: "mismatch",
            first: raw.first,
            second: raw.second,
            remainingMs: raw.remainingMs,
        };
    }
    return null;
}
function isPosition(value, state, occupied) {
    return (isSafeCount(value, state.board.deck.length - 1) &&
        !occupied.has(value));
}
function isSafeCount(value, maximum) {
    return Number.isSafeInteger(value) && typeof value === "number" && value >= 0 && value <= maximum;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasExactKeys(value, keys) {
    if (!isRecord(value))
        return false;
    const actual = Object.keys(value);
    return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function utf8Length(value) {
    return new TextEncoder().encode(value).byteLength;
}
