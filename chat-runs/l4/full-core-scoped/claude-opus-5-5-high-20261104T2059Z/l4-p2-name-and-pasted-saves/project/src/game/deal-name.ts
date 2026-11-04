export const DEAL_NAME_MAX_LENGTH = 40;

// An empty name means an unnamed game. A name keeps its spaces and every character except
// line breaks. String length counts UTF-16 code units, as the limit does.
export function isDealName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= DEAL_NAME_MAX_LENGTH &&
    !/[\r\n]/.test(value)
  );
}
