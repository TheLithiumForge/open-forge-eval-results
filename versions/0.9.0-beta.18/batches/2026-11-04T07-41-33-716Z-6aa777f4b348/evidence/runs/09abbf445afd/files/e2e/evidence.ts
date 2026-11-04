import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Page } from '@playwright/test';

const PALETTE_NAMES = ['cyan', 'magenta', 'green', 'yellow', 'orange', 'violet', 'rose', 'ice'] as const;
const SHAPE_NAMES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const MARKER_NAMES = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;

export async function saveEvidence(path: string, content: string): Promise<void> {
  const destination = resolve(process.cwd(), 'evidence', path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content, 'utf8');
}

export async function saveScreenshot(page: Page, path: string): Promise<void> {
  const destination = resolve(process.cwd(), 'evidence', path);
  await mkdir(dirname(destination), { recursive: true });
  await page.screenshot({ path: destination, fullPage: true });
}

export async function captureFaceSheet(page: Page, path: string): Promise<number> {
  const orderedNames = Array.from({ length: 128 }, (_, id) => {
    const markerIndex = Math.floor(id / 8) % 8;
    const palette = PALETTE_NAMES[markerIndex];
    const shape = SHAPE_NAMES[id % 8];
    const marker = MARKER_NAMES[markerIndex];
    if (palette === undefined || shape === undefined || marker === undefined) throw new Error('Face catalogue is incomplete.');
    const fill = id < 64 ? 'solid' : 'outline';
    return `${palette} ${fill} ${shape}, marker ${marker}`;
  });
  const sheet = await page.evaluate((names) => {
    const existing = new Set<string>();
    const faceNodes = Array.from(document.querySelectorAll<SVGSVGElement>('.memory-card--matched svg.card-face'));
    const unique = new Map<string, SVGSVGElement>();
    for (const svg of faceNodes) {
      const name = svg.closest('button')?.getAttribute('aria-label')
        ?.replace(/^Row \d+, column \d+, /, '')
        ?.replace(/, matched$/, '');
      if (name === undefined || existing.has(name)) continue;
      existing.add(name);
      unique.set(name, svg);
    }
    const panel = document.createElement('div');
    panel.className = 'face-sheet-evidence';
    panel.style.cssText = 'display:grid;grid-template-columns:repeat(16,44px);gap:6px;padding:6px;width:max-content;background:#141827;filter:grayscale(1)';
    for (const name of names) {
      const svg = unique.get(name);
      if (svg === undefined) continue;
      const card = document.createElement('div');
      card.style.cssText = 'width:44px;height:44px;box-sizing:border-box;border:2px solid #757C9A;border-radius:8px;background:#111625;padding:0';
      card.append(svg.cloneNode(true));
      panel.append(card);
    }
    document.body.append(panel);
    return { count: panel.childElementCount };
  }, orderedNames);
  const destination = resolve(process.cwd(), 'evidence', path);
  await mkdir(dirname(destination), { recursive: true });
  await page.locator('.face-sheet-evidence').screenshot({ path: destination });
  await page.locator('.face-sheet-evidence').evaluate((node) => node.remove());
  return sheet.count;
}
