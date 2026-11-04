import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Face } from '../src/game/board/Face.tsx';

export function faceSheet(): string {
  const ids = Array.from({ length: 8 }, (_, marker) => Array.from({ length: 16 }, (_, column) =>
    marker * 8 + column % 8 + (column >= 8 ? 64 : 0))).flat();
  const faces = ids.map((id) => `<div class="tile"><div class="face">${renderToStaticMarkup(createElement(Face, { id }))}</div><div>${id}</div></div>`).join('');
  return `<!doctype html><meta charset="utf-8"><title>128 Neon Pairs faces at 44px</title>
    <style>*{box-sizing:border-box}body{margin:0;background:#090B14;color:#F4F6FF;font:12px system-ui}
    #sheet{display:grid;grid-template-columns:repeat(16,44px);gap:6px;padding:16px;width:max-content;filter:grayscale(1)}
    .tile{text-align:center}.face{width:44px;height:44px;border:2px solid #757C9A;border-radius:8px;background:#111625}
    svg{display:block;width:100%;height:100%}</style><div id="sheet">${faces}</div>`;
}
