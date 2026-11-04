import { REPLAY_ACTION_LIMIT, REPLAY_LIMIT_BYTES, REPLAY_VERSION, } from "./constants.js";
import { createGame } from "./state.js";
import { activateCard, advanceGame } from "./turns.js";
export function replayGame(text) {
    if (new TextEncoder().encode(text).byteLength > REPLAY_LIMIT_BYTES)
        return null;
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        return null;
    }
    if (!hasKeys(value, ["version", "boardCode", "actions", "endMs"]))
        return null;
    if (value.version !== REPLAY_VERSION || typeof value.boardCode !== "string")
        return null;
    if (!Array.isArray(value.actions) || value.actions.length > REPLAY_ACTION_LIMIT)
        return null;
    if (!isTime(value.endMs))
        return null;
    const state = createGame(value.boardCode);
    if (state === null)
        return null;
    const actions = [];
    let previousTime = 0;
    for (const action of value.actions) {
        if (!hasKeys(action, ["atMs", "index"]) || !isTime(action.atMs))
            return null;
        if (!isIndex(action.index, state.board.deck.length))
            return null;
        if (action.atMs < previousTime)
            return null;
        previousTime = action.atMs;
        actions.push({ atMs: action.atMs, index: action.index });
    }
    if (actions.length > 0 && value.endMs < previousTime)
        return null;
    let current = state;
    let currentTime = 0;
    for (const action of actions) {
        current = advanceGame(current, action.atMs - currentTime);
        current = activateCard(current, action.index);
        currentTime = action.atMs;
    }
    return advanceGame(current, value.endMs - currentTime);
}
function isTime(value) {
    return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}
function isIndex(value, length) {
    return Number.isSafeInteger(value) && typeof value === "number" && value >= 0 && value < length;
}
function hasKeys(value, keys) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return false;
    const actual = Object.keys(value);
    return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
