import { createBoard } from "./boardCode.js";
export function createGame(boardCode) {
    const board = createBoard(boardCode);
    if (board === null)
        return null;
    return {
        board,
        matched: [],
        selection: { kind: "closed" },
        moves: 0,
        elapsedMs: 0,
        started: false,
    };
}
export function isWon(state) {
    return state.matched.length === state.board.deck.length;
}
export function matchedPairs(state) {
    return state.matched.length / 2;
}
export function isMatched(state, index) {
    return state.matched.includes(index);
}
