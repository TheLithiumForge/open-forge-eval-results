import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Card } from './Card.tsx';
import { Face } from './Face.tsx';
import { faceIdentity } from './faceIdentity.ts';

describe('face artwork and hidden card privacy', () => {
  it('names the documented identities and keeps every identity distinct without color', () => {
    expect(faceIdentity(0).name).toBe('cyan solid circle, marker top');
    expect(faceIdentity(64).name).toBe('cyan outline circle, marker top');
    expect(faceIdentity(127).name).toBe('ice outline chevron, marker top-left');
    const identities = Array.from({ length: 128 }, (_, id) => faceIdentity(id));
    expect(new Set(identities.map((face) => [face.path, face.fill, face.markerX, face.markerY].join('|'))).size)
      .toBe(128);
    for (const face of identities) expect(Math.hypot(face.markerX - 50, face.markerY - 50)).toBeCloseTo(40);
  });

  it('renders diagonal markers last, with a separating stroke and the required SVG geometry', () => {
    const markup = renderToStaticMarkup(<Face id={73} />);
    expect(markup).toContain('viewBox="0 0 100 100"');
    expect(markup).toContain('fill="none"');
    expect(markup).toContain('stroke-width="5"');
    expect(markup).toContain('r="5"');
    expect(markup).toContain('stroke="#111625" stroke-width="3"');
    expect(markup.indexOf('<circle')).toBeGreaterThan(markup.indexOf('<path'));
  });

  it('makes hidden DOM identical across faces and adds identity only when exposed', () => {
    const render = (face: number, state: 'closed' | 'revealed' | 'matched') => renderToStaticMarkup(
      <Card index={0} size={4} face={face} state={state} tabIndex={0} blocked={false} ref={null}
        onActivate={() => {}} onFocus={() => {}} onKeyDown={() => {}} />,
    );
    expect(render(0, 'closed')).toBe(render(127, 'closed'));
    expect(render(127, 'closed')).toContain('Row 1, column 1, closed');
    expect(render(0, 'revealed')).toContain('Row 1, column 1, cyan solid circle, marker top, revealed');
    expect(render(0, 'matched')).toContain('aria-disabled="true"');
    expect(render(0, 'matched')).toContain('✓');
  });
});
