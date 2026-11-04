export const shapeNames = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const markerNames = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const fillNames = ['solid', 'outline'] as const;
export const palette = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;

export function faceParts(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 127) throw new Error('Invalid face');
  const shape = shapeNames[id % 8];
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = markerNames[markerIndex];
  const fill = fillNames[Math.floor(id / 64)];
  const color = palette[markerIndex];
  if (!shape || !marker || !fill || !color) throw new Error('Invalid face parts');
  const angle = markerIndex * Math.PI / 4;
  return { shape, marker, fill, color: color.color,
    markerX: 50 + 40 * Math.sin(angle), markerY: 50 - 40 * Math.cos(angle),
    name: `${color.name} ${fill} ${shape}, marker ${marker}` };
}
