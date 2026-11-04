/// <reference types="vite/client" />
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '../state.ts';
import type { GameState } from '../state.ts';
import { activateCard } from '../transitions.ts';
import { Card } from './Card.tsx';

function initial(): GameState {
  const game = createGame('np1-4-1');
  if (!game) throw new Error('Invalid test board');
  return game;
}
function markup(game: GameState, index: number): string {
  return renderToStaticMarkup(<Card game={game} index={index} tabIndex={0} ref={null}
    onFocus={() => undefined} onActivate={() => undefined} onKeyDown={() => undefined} />);
}

describe('card information boundaries', () => {
  it('reveals no face identity in a hidden card DOM', () => {
    const hidden = markup(initial(), 0);
    expect(hidden).toContain('aria-label="Row 1, column 1, closed"');
    expect(hidden).toContain('card-back');
    expect(hidden).not.toContain('card-face');
    expect(hidden).not.toContain('cyan');
    expect(hidden).not.toContain('marker');
    expect(hidden).not.toContain('data-');
    expect(hidden).not.toContain('aria-disabled');
  });
  it('mounts and names a revealed face and preserves matched focusability', () => {
    const revealed = activateCard(initial(), 0);
    expect(markup(revealed, 0)).toContain('cyan solid plus, marker top, revealed');
    const matched = markup(activateCard(revealed, 11), 0);
    expect(matched).toContain('cyan solid plus, marker top, matched');
    expect(matched).toContain('aria-disabled="true"');
    expect(matched).toContain('tabindex="0"');
    expect(matched).toContain('match-check');
    expect(matched).not.toContain('disabled=""');
  });
});
