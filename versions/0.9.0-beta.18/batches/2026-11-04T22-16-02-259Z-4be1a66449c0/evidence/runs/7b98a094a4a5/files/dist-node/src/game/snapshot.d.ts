import { type GameState } from "./state.js";
export declare function encodeSnapshot(state: GameState): string;
export declare function decodeSnapshot(text: string): GameState | null;
