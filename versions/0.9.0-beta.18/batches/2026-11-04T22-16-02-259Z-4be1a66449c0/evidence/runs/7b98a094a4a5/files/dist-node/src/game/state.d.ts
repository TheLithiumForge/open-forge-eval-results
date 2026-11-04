import { type Board } from "./boardCode.js";
export type Selection = {
    readonly kind: "closed";
} | {
    readonly kind: "one";
    readonly index: number;
} | {
    readonly kind: "mismatch";
    readonly first: number;
    readonly second: number;
    readonly remainingMs: number;
};
export interface GameState {
    readonly board: Board;
    readonly matched: readonly number[];
    readonly selection: Selection;
    readonly moves: number;
    readonly elapsedMs: number;
    readonly started: boolean;
}
export declare function createGame(boardCode: string): GameState | null;
export declare function isWon(state: GameState): boolean;
export declare function matchedPairs(state: GameState): number;
export declare function isMatched(state: GameState, index: number): boolean;
