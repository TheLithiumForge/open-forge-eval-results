import { BOARD_CODE_VERSION, BOARD_SIZES } from "./constants.js";
const PARK_MILLER_MODULUS = 2_147_483_647;
const PARK_MILLER_RANGE = PARK_MILLER_MODULUS - 1;
const PARK_MILLER_MULTIPLIER = 16_807;
const BOARD_CODE_PATTERN = new RegExp(`^${BOARD_CODE_VERSION}-(4|6|8|10|12|14|16)-([1-9][0-9]*)$`);
export function parseBoardCode(code) {
    const match = BOARD_CODE_PATTERN.exec(code);
    if (match === null)
        return null;
    const size = Number(match[1]);
    const seed = Number(match[2]);
    if (!isBoardSize(size) || !Number.isSafeInteger(seed) || seed > PARK_MILLER_RANGE) {
        return null;
    }
    return { boardCode: code, size, seed };
}
export function isBoardSize(value) {
    return BOARD_SIZES.some((size) => size === value);
}
export function formatBoardCode(size, seed) {
    return `${BOARD_CODE_VERSION}-${size}-${seed}`;
}
export function generateDeck(size, seed) {
    const deck = [];
    for (let face = 0; face < (size * size) / 2; face += 1) {
        deck.push(face, face);
    }
    let generatorState = seed;
    const draw = (bound) => {
        const limit = Math.floor(PARK_MILLER_RANGE / bound) * bound;
        while (true) {
            generatorState = (generatorState * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS;
            const value = generatorState - 1;
            if (value < limit)
                return value % bound;
        }
    };
    for (let index = deck.length - 1; index > 0; index -= 1) {
        const otherIndex = draw(index + 1);
        const current = deck[index];
        const other = deck[otherIndex];
        if (current !== undefined && other !== undefined) {
            deck[index] = other;
            deck[otherIndex] = current;
        }
    }
    return Object.freeze(deck);
}
export function createBoard(code) {
    const parsed = parseBoardCode(code);
    if (parsed === null)
        return null;
    return Object.freeze({
        boardCode: parsed.boardCode,
        size: parsed.size,
        deck: generateDeck(parsed.size, parsed.seed),
    });
}
