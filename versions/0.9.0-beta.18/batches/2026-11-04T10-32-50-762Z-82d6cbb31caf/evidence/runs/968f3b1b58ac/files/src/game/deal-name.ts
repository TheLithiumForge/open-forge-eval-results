export const DEAL_NAME_MAX_LENGTH = 40;

export function isDealName(value: unknown): value is string {
  return typeof value === 'string' && value.length <= DEAL_NAME_MAX_LENGTH && !/[\r\n]/.test(value);
}
