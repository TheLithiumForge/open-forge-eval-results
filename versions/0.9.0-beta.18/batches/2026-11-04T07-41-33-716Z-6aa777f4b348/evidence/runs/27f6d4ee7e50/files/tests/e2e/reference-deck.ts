const MODULUS = 2_147_483_647;
const RANGE = MODULUS - 1;

export function referenceDeck(boardCode: string): number[] {
  const match = /^np1-(4|6|8|10|12|14|16)-([1-9][0-9]*)$/.exec(boardCode);
  const sizeText = match?.[1];
  const seedText = match?.[2];
  if (sizeText === undefined || seedText === undefined) throw new Error(`Invalid board code: ${boardCode}`);
  const size = Number(sizeText);
  let state = Number(seedText);
  if (!Number.isSafeInteger(state) || state > RANGE) throw new Error(`Invalid board code: ${boardCode}`);

  const deck = Array.from({ length: size * size }, (_, index) => Math.floor(index / 2));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const bound = index + 1;
    const limit = Math.floor(RANGE / bound) * bound;
    let selected: number | null = null;
    while (selected === null) {
      state = (state * 16_807) % MODULUS;
      const candidate = state - 1;
      if (candidate < limit) selected = candidate % bound;
    }
    const current = deck[index];
    const target = deck[selected];
    if (current === undefined || target === undefined) throw new Error("Deck index is out of range.");
    deck[index] = target;
    deck[selected] = current;
  }
  return deck;
}

export function referencePairs(deck: readonly number[]): Array<readonly [number, number]> {
  const firstPosition = new Map<number, number>();
  const pairs: Array<readonly [number, number]> = [];
  deck.forEach((face, index) => {
    const first = firstPosition.get(face);
    if (first === undefined) firstPosition.set(face, index);
    else pairs.push([first, index]);
  });
  return pairs;
}
