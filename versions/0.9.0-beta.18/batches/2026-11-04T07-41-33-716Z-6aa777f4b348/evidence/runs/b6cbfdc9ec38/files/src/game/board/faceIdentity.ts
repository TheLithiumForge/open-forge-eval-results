export const SHAPES = [
  { name: 'circle', path: 'M75 50a25 25 0 1 1-50 0a25 25 0 1 1 50 0Z' },
  { name: 'square', path: 'M25 25H75V75H25Z' },
  { name: 'triangle', path: 'M50 25L75 75H25Z' },
  { name: 'diamond', path: 'M50 25L75 50L50 75L25 50Z' },
  { name: 'star', path: 'M50 25L56 42L74 42L60 53L65 73L50 61L35 73L40 53L26 42L44 42Z' },
  { name: 'hexagon', path: 'M37.5 25H62.5L75 50L62.5 75H37.5L25 50Z' },
  { name: 'plus', path: 'M42 25H58V42H75V58H58V75H42V58H25V42H42Z' },
  { name: 'chevron', path: 'M25 25H44L75 50L44 75H25L56 50Z' },
] as const;

export const PALETTE = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;

const DIAGONAL = 40 / Math.sqrt(2);
export const MARKERS = [
  { name: 'top', x: 0, y: -40 }, { name: 'top-right', x: DIAGONAL, y: -DIAGONAL },
  { name: 'right', x: 40, y: 0 }, { name: 'bottom-right', x: DIAGONAL, y: DIAGONAL },
  { name: 'bottom', x: 0, y: 40 }, { name: 'bottom-left', x: -DIAGONAL, y: DIAGONAL },
  { name: 'left', x: -40, y: 0 }, { name: 'top-left', x: -DIAGONAL, y: -DIAGONAL },
] as const;
export const FILLS = ['solid', 'outline'] as const;

export function faceIdentity(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 127) throw new Error('Invalid face identity.');
  const shape = SHAPES[id % 8];
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = MARKERS[markerIndex];
  const palette = PALETTE[markerIndex];
  const fill = FILLS[Math.floor(id / 64)];
  if (!shape || !marker || !palette || !fill) throw new Error('Invalid face parts.');
  return {
    path: shape.path, color: palette.color, fill,
    markerX: 50 + marker.x, markerY: 50 + marker.y,
    name: `${palette.name} ${fill} ${shape.name}, marker ${marker.name}`,
  };
}
