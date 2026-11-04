import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Card } from './Card.tsx';

const activate = () => {};

describe('card DOM information', () => {
  it('keeps a hidden face out of artwork, names and attributes', () => {
    const html = renderToStaticMarkup(<Card index={0} size={4} face={null} matched={false}
      blocked={false} tabStop={true} onActivate={activate} />);
    expect(html).toContain('aria-label="Row 1, column 1, closed"');
    expect(html).toContain('class="card-back"');
    expect(html).not.toContain('card-face');
    expect(html).not.toContain('cyan');
    expect(html).not.toContain('face=');
    expect(html).not.toContain('data-face');
  });

  it('names revealed identities and preserves native focus for matches', () => {
    const html = renderToStaticMarkup(<Card index={5} size={4} face={64} matched={true}
      blocked={false} tabStop={true} onActivate={activate} />);
    expect(html).toContain('Row 2, column 2, cyan outline circle, marker top, matched');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain(' disabled=');
    expect(html).toContain('card-face');
    expect(html).toContain('card-check');
  });
});
