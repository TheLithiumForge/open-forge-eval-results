import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { activateCard, createGame } from '../game.ts';
import { Board } from './Board.tsx';
import { FaceSvg } from './FaceSvg.tsx';

const ignoreActivation = () => {};

describe('card DOM information', () => {
  it('renders identical hidden DOM for different deals with one board tab stop', () => {
    const first = renderToStaticMarkup(<Board game={createGame('np1-4-1')}
      blocked={false} revision={0} onActivate={ignoreActivation} />);
    const second = renderToStaticMarkup(<Board game={createGame('np1-4-2')}
      blocked={false} revision={0} onActivate={ignoreActivation} />);
    expect(first).toBe(second);
    expect(first).toContain('aria-label="Row 1, column 1, closed"');
    expect(first).not.toContain('card-face');
    expect(first).not.toContain('cyan');
    expect(first.match(/tabindex="0"/g)).toHaveLength(1);
    expect(first.match(/tabindex="-1"/g)).toHaveLength(15);
  });

  it('mounts and names only revealed faces and keeps matched cards focusable', () => {
    const revealed = activateCard(createGame('np1-4-1'), 0);
    const one = renderToStaticMarkup(<Board game={revealed} blocked={false}
      revision={0} onActivate={ignoreActivation} />);
    expect(one.match(/class="card-face"/g)).toHaveLength(1);
    expect(one).toContain('Row 1, column 1, cyan solid plus, marker top, revealed');
    const match = activateCard(revealed, 11);
    const html = renderToStaticMarkup(<Board game={match} blocked={false}
      revision={0} onActivate={ignoreActivation} />);
    expect(html.match(/class="card-face"/g)).toHaveLength(2);
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(html).not.toMatch(/\sdisabled(?:=|\s|>)/);
    expect(html).toContain('Row 3, column 4, cyan solid plus, marker top, matched');
    expect(html.match(/class="card-check"/g)).toHaveLength(2);
  });

  it('uses a background-separated marker and an unfilled 5-unit outline', () => {
    const html = renderToStaticMarkup(<FaceSvg faceId={73} />);
    expect(html).toContain('viewBox="0 0 100 100"');
    expect(html).toContain('fill="none" stroke="#FF71D6" stroke-width="5"');
    expect(html).toContain('r="5" fill="#FF71D6" stroke="#111625" stroke-width="3"');
  });
});
