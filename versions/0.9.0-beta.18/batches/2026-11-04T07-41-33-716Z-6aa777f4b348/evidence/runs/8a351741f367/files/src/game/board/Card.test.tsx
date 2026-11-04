import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { appearance } from './appearance.ts';
import { Card } from './Card.tsx';
import { Face } from './Face.tsx';

function card(face: number, revealed = false, matched = false): string {
  return renderToStaticMarkup(<Card face={face} index={0} size={4} revealed={revealed} matched={matched}
    tabIndex={0} buttonRef={() => undefined} onFocus={() => undefined} onActivate={() => undefined} />);
}

describe('card information and artwork', () => {
  it('renders identical hidden markup regardless of the face and exposes only position/state', () => {
    const hidden = card(0);
    for (let face = 1; face < 128; face += 1) expect(card(face)).toBe(hidden);
    expect(hidden).toContain('aria-label="Row 1, column 1, closed"');
    expect(hidden).not.toContain('<circle');
    expect(hidden).not.toContain('cyan');
  });

  it('names a revealed face and retains artwork and focusability when matched', () => {
    expect(card(0, true)).toContain('Row 1, column 1, cyan solid circle, marker top, revealed');
    const matched = card(64, true, true);
    expect(matched).toContain('Row 1, column 1, cyan outline circle, marker top, matched');
    expect(matched).toContain('aria-disabled="true"');
    expect(matched).toContain('tabindex="0"');
    expect(matched).not.toContain(' disabled=');
    expect(matched).toContain('✓');
  });

  it('has 128 distinct shape/marker/fill names and drawings with normalized separated markers', () => {
    const names = new Set<string>();
    const drawings = new Set<string>();
    for (let face = 0; face < 128; face += 1) {
      const look = appearance(face);
      names.add(look.name);
      drawings.add(renderToStaticMarkup(<Face face={face} />));
      expect(Math.hypot(look.markerX - 50, look.markerY - 50)).toBeCloseTo(40, 10);
    }
    expect(names.size).toBe(128);
    expect(drawings.size).toBe(128);
    expect(appearance(73).name).toBe('magenta outline square, marker top-right');
    expect(renderToStaticMarkup(<Face face={73} />)).toContain('stroke-width="3"');
  });
});
