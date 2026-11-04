import { expect, it } from 'vitest';
import { parseJson } from './validation.ts';

it('enforces a UTF-8 byte limit rather than a JavaScript character limit', () => {
  const text = '{"value":"é"}';
  expect(parseJson(text, text.length)).toBeNull();
  expect(parseJson(text, text.length + 1)).toEqual({ value: 'é' });
});
