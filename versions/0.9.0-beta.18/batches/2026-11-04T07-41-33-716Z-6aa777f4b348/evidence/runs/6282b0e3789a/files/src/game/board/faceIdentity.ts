const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const DIAGONAL = 40 / Math.sqrt(2);
const MARKERS = [
  { name: 'top', x: 0, y: -40, color: 'cyan', hex: '#63E7FF' },
  { name: 'top-right', x: DIAGONAL, y: -DIAGONAL, color: 'magenta', hex: '#FF71D6' },
  { name: 'right', x: 40, y: 0, color: 'green', hex: '#8BEA7D' },
  { name: 'bottom-right', x: DIAGONAL, y: DIAGONAL, color: 'yellow', hex: '#FFE082' },
  { name: 'bottom', x: 0, y: 40, color: 'orange', hex: '#FFB064' },
  { name: 'bottom-left', x: -DIAGONAL, y: DIAGONAL, color: 'violet', hex: '#B49AFF' },
  { name: 'left', x: -40, y: 0, color: 'rose', hex: '#FF8296' },
  { name: 'top-left', x: -DIAGONAL, y: -DIAGONAL, color: 'ice', hex: '#D9F3FF' },
] as const;

export function faceIdentity(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 127) throw new Error('Invalid face.');
  const shape = SHAPES[id % 8];
  const marker = MARKERS[Math.floor(id / 8) % 8];
  if (shape === undefined || marker === undefined) throw new Error('Invalid face.');
  const fill = Math.floor(id / 64) === 0 ? 'solid' : 'outline';
  return {
    shape, fill, color: marker.hex,
    markerX: 50 + marker.x, markerY: 50 + marker.y,
    name: `${marker.color} ${fill} ${shape}, marker ${marker.name}`,
  };
}
