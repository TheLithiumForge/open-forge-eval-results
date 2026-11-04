export const DEAL_NAME_MAX_CODE_UNITS = 40;

export function isValidDealName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= DEAL_NAME_MAX_CODE_UNITS &&
    !value.includes('\r') &&
    !value.includes('\n')
  );
}
