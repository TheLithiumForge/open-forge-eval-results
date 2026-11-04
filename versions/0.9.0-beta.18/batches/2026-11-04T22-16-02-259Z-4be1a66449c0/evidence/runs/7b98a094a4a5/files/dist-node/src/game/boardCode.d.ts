import { type BoardSize } from "./constants.js";
export interface Board {
    readonly boardCode: string;
    readonly size: BoardSize;
    readonly deck: readonly number[];
}
export interface ParsedBoardCode {
    readonly boardCode: string;
    readonly size: BoardSize;
    readonly seed: number;
}
export declare function parseBoardCode(code: string): ParsedBoardCode | null;
export declare function isBoardSize(value: number): value is BoardSize;
export declare function formatBoardCode(size: BoardSize, seed: number): string;
export declare function generateDeck(size: BoardSize, seed: number): readonly number[];
export declare function createBoard(code: string): Board | null;
