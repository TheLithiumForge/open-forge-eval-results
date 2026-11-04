import { ELAPSED_LIMIT_MS, MISMATCH_MS, MOVE_LIMIT } from "./constants.js";
import { isMatched, isWon } from "./state.js";
export function activateCard(state, index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.board.deck.length) {
        return state;
    }
    if (isWon(state) || isMatched(state, index))
        return state;
    switch (state.selection.kind) {
        case "closed":
            return {
                ...state,
                selection: { kind: "one", index },
                started: true,
            };
        case "one":
            if (state.selection.index === index)
                return state;
            return revealSecond(state, state.selection.index, index);
        case "mismatch":
            return state;
    }
}
function revealSecond(state, first, second) {
    const moves = Math.min(MOVE_LIMIT, state.moves + 1);
    const firstFace = state.board.deck[first];
    const secondFace = state.board.deck[second];
    if (firstFace !== undefined && firstFace === secondFace) {
        return {
            ...state,
            matched: [...state.matched, first, second],
            selection: { kind: "closed" },
            moves,
        };
    }
    return {
        ...state,
        selection: { kind: "mismatch", first, second, remainingMs: MISMATCH_MS },
        moves,
    };
}
export function advanceGame(state, milliseconds) {
    if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0)
        return state;
    if (!state.started || isWon(state))
        return state;
    const elapsedMs = Math.min(ELAPSED_LIMIT_MS, state.elapsedMs + milliseconds);
    if (state.selection.kind !== "mismatch")
        return { ...state, elapsedMs };
    const remainingMs = state.selection.remainingMs - milliseconds;
    if (remainingMs <= 0) {
        return { ...state, elapsedMs, selection: { kind: "closed" } };
    }
    return {
        ...state,
        elapsedMs,
        selection: { ...state.selection, remainingMs },
    };
}
