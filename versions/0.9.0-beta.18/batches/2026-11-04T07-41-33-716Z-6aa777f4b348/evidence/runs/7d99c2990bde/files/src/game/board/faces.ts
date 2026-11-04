const shapeNames = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const markerNames = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
const palette = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;

export function describeFace(id: number) {
  const shape = shapeNames[id % 8];
  const marker = Math.floor(id / 8) % 8;
  const position = markerNames[marker];
  const ink = palette[marker];
  if (!shape || !position || !ink || !Number.isInteger(id) || id < 0 || id > 127) {
    throw new Error('Invalid face identity.');
  }
  const fill = id < 64 ? 'solid' : 'outline';
  const angle = marker * Math.PI / 4;
  return { shape, color: ink.color, fill,
    name: `${ink.name} ${fill} ${shape}, marker ${position}`,
    markerX: 50 + 40 * Math.sin(angle), markerY: 50 - 40 * Math.cos(angle) };
}
