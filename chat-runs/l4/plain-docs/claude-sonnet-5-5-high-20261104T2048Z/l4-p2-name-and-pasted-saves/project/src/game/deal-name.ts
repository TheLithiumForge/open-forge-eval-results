export const DEAL_NAME_MAX_UNITS = 40;

// A name keeps every character and surrounding space. The empty string means an unnamed game.
export function isValidDealName(name: string): boolean {
  return name.length <= DEAL_NAME_MAX_UNITS && !/[\r\n]/.test(name);
}
