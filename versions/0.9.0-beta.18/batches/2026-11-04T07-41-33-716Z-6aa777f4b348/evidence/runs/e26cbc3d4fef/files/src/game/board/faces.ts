const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const palette = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;
const diagonal = 40 / Math.sqrt(2);
const markers = [
  { name: 'top', x: 0, y: -40 }, { name: 'top-right', x: diagonal, y: -diagonal },
  { name: 'right', x: 40, y: 0 }, { name: 'bottom-right', x: diagonal, y: diagonal },
  { name: 'bottom', x: 0, y: 40 }, { name: 'bottom-left', x: -diagonal, y: diagonal },
  { name: 'left', x: -40, y: 0 }, { name: 'top-left', x: -diagonal, y: -diagonal },
] as const;

export type FaceShape = (typeof shapes)[number];
export const fills = { solid: 'solid', outline: 'outline' } as const;

export function describeFace(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 127) throw new RangeError('Invalid face identity.');
  const shape = shapes[id % 8];
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = markers[markerIndex];
  const color = palette[markerIndex];
  if (!shape || !marker || !color) throw new RangeError('Invalid face identity.');
  const fill = id < 64 ? fills.solid : fills.outline;
  return {
    shape, fill, color: color.color, markerX: 50 + marker.x, markerY: 50 + marker.y,
    name: `${color.name} ${fill} ${shape}, marker ${marker.name}`,
  };
}

export function faceName(id: number): string {
  return describeFace(id).name;
}
