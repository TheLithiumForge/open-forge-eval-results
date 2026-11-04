export const DEAL_NAME_MAX_LENGTH = 40;
export const UNNAMED_DEAL = '';

// Length counts UTF-16 code units. Every other character and surrounding space stays as typed.
export function isDealName(value: string): boolean {
  return value.length <= DEAL_NAME_MAX_LENGTH && !/[\r\n]/.test(value);
}
