import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';

interface Setup {
  names: string[];
  players: number;
}
export function encodeSetup(players: number, names: string[]): string {
  return JSON.stringify(
    { format: 'neon-pairs/tournament-setup', setup: { names, players }, version: 1 },
    null,
    2,
  );
}
export function decodeSetup(text: string): { setup: Setup | null; error: string } | null {
  if (!isWithinBytes(text, 262144)) return null;
  const root = parseJson(text);
  if (!isJsonObject(root) || root.format !== 'neon-pairs/tournament-setup') return null;
  const fail = (error = 'Invalid tournament.') => ({ setup: null, error });
  for (const [value, keys] of [
    [root, ['format', 'setup', 'version']],
    [root.setup, ['names', 'players']],
  ] as const) {
    if (!isJsonObject(value)) return fail();
    const extra = Object.keys(value).find((key) => !keys.some((allowed) => allowed === key));
    if (extra) return fail(`Unknown field: ${extra}.`);
    if (!hasExactKeys(value, keys)) return fail();
  }
  if (root.version !== 1 || !isJsonObject(root.setup)) return fail();
  const { names, players } = root.setup;
  if (
    (players !== 4 && players !== 8) ||
    !Array.isArray(names) ||
    names.length !== 8 ||
    !names.every((name: unknown): name is string => typeof name === 'string')
  )
    return fail();
  return { setup: { names, players }, error: '' };
}
