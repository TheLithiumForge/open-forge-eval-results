import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Face } from './Face.tsx';
import { describeFace } from './faces.ts';

describe('all 128 card faces', () => {
  it('derives unique names from shape, marker and fill', () => {
    const identities = Array.from({ length: 128 }, (_, face) => describeFace(face));
    expect(new Set(identities.map((identity) => identity.name)).size).toBe(128);
    expect(identities[0]?.name).toBe('cyan solid circle, marker top');
    expect(identities[64]?.name).toBe('cyan outline circle, marker top');
    expect(identities[127]?.name).toBe('ice outline chevron, marker top-left');
    expect(identities[9]?.name).toBe('magenta solid square, marker top-right');
    expect(identities[73]?.name).toBe('magenta outline square, marker top-right');
  });

  it('normalizes every marker to radius 40 including diagonals', () => {
    for (let face = 0; face < 128; face += 1) {
      const identity = describeFace(face);
      expect(Math.hypot(identity.markerX - 50, identity.markerY - 50)).toBeCloseTo(40, 10);
    }
    expect(describeFace(8).markerX).toBeCloseTo(78.2842712475);
    expect(describeFace(8).markerY).toBeCloseTo(21.7157287525);
  });

  it('renders the specified viewBox, outline and separated marker', () => {
    const outlined = renderToStaticMarkup(<Face face={73} />);
    expect(outlined).toContain('viewBox="0 0 100 100"');
    expect(outlined).toContain('fill="none" stroke="#FF71D6" stroke-width="5"');
    expect(outlined).toContain('r="5" fill="#FF71D6" stroke="#111625" stroke-width="3"');
    expect(outlined).not.toContain('id=');
  });

  it('produces a development-only grayscale sheet at the 44px card minimum', () => {
    const cells = Array.from({ length: 128 }, (_, face) =>
      `<figure><div class="face-cell">${renderToStaticMarkup(<Face face={face} />)}</div><figcaption>${face}</figcaption></figure>`).join('');
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Neon Pairs — 128 grayscale faces</title><style>
*{box-sizing:border-box}body{margin:0;padding:16px;background:#090B14;color:#F4F6FF;font:14px/24px system-ui,sans-serif}
h1{font-size:24px;margin:0 0 8px}p{margin:0 0 16px}.sheet{display:grid;grid-template-columns:repeat(8,44px);gap:6px;filter:grayscale(1)}
figure{margin:0;width:44px}.face-cell{width:44px;height:44px;border:2px solid #757C9A;border-radius:8px;background:#111625}
svg{display:block;width:100%;height:100%}figcaption{text-align:center;font-size:10px;line-height:16px}
</style><h1>128 grayscale faces</h1><p>44px cards. IDs 0–63 solid; 64–127 outline. Each row changes the marker direction.</p><div class="sheet">${cells}</div></html>`;
    mkdirSync('evidence', { recursive: true });
    writeFileSync('evidence/faces-grayscale.html', html);
    expect(cells.match(/class="face-cell"/g)).toHaveLength(128);
  });
});
