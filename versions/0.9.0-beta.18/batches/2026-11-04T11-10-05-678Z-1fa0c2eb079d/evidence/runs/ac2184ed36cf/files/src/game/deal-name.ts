export const DEAL_NAME_MAX_LENGTH = 40;

export function isValidDealName(name: string): boolean {
  return name.length <= DEAL_NAME_MAX_LENGTH && !/[\r\n]/.test(name);
}
