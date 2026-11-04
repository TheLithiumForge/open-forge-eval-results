// A deal name is one line of at most 40 UTF-16 code units, kept exactly as typed.
export const DEAL_NAME_MAX_UNITS = 40;
// An empty name means the game is unnamed.
export const UNNAMED = '';
const LINE_BREAK = /[\r\n]/;

export function isDealName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= DEAL_NAME_MAX_UNITS &&
    !LINE_BREAK.test(value)
  );
}
