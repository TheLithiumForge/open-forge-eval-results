export const DEAL_NAME_MAX_LENGTH = 40;

export function isValidDealName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= DEAL_NAME_MAX_LENGTH &&
    !/[\r\n]/.test(value)
  );
}
