import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Card } from './Card.tsx';

function markup(face: number | null, matched = false): string {
  return renderToStaticMarkup(createElement(Card, { index: 0, size: 4, face, matched,
    tabStop: true, buttonRef: null, onFocus: () => {}, onKeyDown: () => {}, onActivate: () => {} }));
}

describe('card information and focus state (I09, I14–I15, A08)', () => {
  it('keeps a hidden card neutral and reveals no face identity or marker', () => {
    const html = markup(null);
    expect(html).toContain('aria-label="Row 1, column 1, closed"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toMatch(/cyan|solid|outline|circle|marker|face-id|data-face/);
    expect(html).not.toContain('#63E7FF');
  });
  it('names a revealed face and mounts its shape and separated marker', () => {
    const html = markup(64);
    expect(html).toContain('cyan outline circle, marker top, revealed');
    expect(html).toContain('stroke-width="5"');
    expect(html).toContain('r="5"');
    expect(html).toContain('stroke="#111625"');
  });
  it('keeps a matched card focusable, named and marked without native disabling', () => {
    const html = markup(0, true);
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('marker top, matched');
    expect(html).toContain('✓');
    expect(html).not.toContain(' disabled=""');
  });
});
