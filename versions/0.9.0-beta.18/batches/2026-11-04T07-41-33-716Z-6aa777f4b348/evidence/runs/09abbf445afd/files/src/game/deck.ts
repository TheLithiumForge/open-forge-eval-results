import type { BoardCode } from './types.ts';

const PARK_MILLER_MODULUS = 2_147_483_647;
const PARK_MILLER_MULTIPLIER = 16_807;
const UNIFORM_SAMPLE_COUNT = PARK_MILLER_MODULUS - 1;

export function generateDeck({ size, seed }: BoardCode): readonly number[] {
  let state = seed;
  const nextState = (): number => {
    state = (state * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS;
    return state;
  };
  const deck = Array.from({ length: size * size }, (_, position) => Math.floor(position / 2));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const choices = index + 1;
    const limit = Math.floor(UNIFORM_SAMPLE_COUNT / choices) * choices;
    let sample = nextState() - 1;
    while (sample >= limit) sample = nextState() - 1;
    const target = sample % choices;
    const current = deck[index];
    const other = deck[target];
    if (current === undefined || other === undefined) throw new Error('Invalid shuffle position.');
    deck[index] = other;
    deck[target] = current;
  }
  return Object.freeze(deck);
}
