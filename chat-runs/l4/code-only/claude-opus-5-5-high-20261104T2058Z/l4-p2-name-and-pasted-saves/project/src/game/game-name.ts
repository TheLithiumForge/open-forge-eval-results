// A game name is a short label the player gives a save. An empty name means the game is unnamed.
export const GAME_NAME_MAX_CHARACTERS = 60;
const CONTROL_CHARACTER = /\p{Cc}/u;

// Surrounding spaces carry no meaning, so names are kept and compared without them.
export function cleanGameName(name: string): string {
  return name.trim();
}

// Lengths count UTF-16 code units, the same unit as the name field's maxlength.
export function isGameName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    cleanGameName(value).length <= GAME_NAME_MAX_CHARACTERS &&
    !CONTROL_CHARACTER.test(value)
  );
}
