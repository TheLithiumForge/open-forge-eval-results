export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const PALETTE = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;

export function faceParts(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 127) throw new Error('Invalid face.');
  const marker = Math.floor(id / 8) % 8;
  const shape = SHAPES[id % 8];
  const palette = PALETTE[marker];
  const position = MARKERS[marker];
  if (!shape || !palette || !position) throw new Error('Invalid face parts.');
  const angle = marker * Math.PI / 4;
  const fill = id < 64 ? 'solid' : 'outline';
  return { shape, ...palette, fill, position,
    markerX: 50 + 40 * Math.sin(angle), markerY: 50 - 40 * Math.cos(angle) };
}

export function faceName(id: number): string {
  const face = faceParts(id);
  return `${face.name} ${face.fill} ${face.shape}, marker ${face.position}`;
}
