export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export type Shape = (typeof SHAPES)[number];
export const POSITIONS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const PALETTE = [
  { name: 'cyan', color: '#63E7FF' }, { name: 'magenta', color: '#FF71D6' },
  { name: 'green', color: '#8BEA7D' }, { name: 'yellow', color: '#FFE082' },
  { name: 'orange', color: '#FFB064' }, { name: 'violet', color: '#B49AFF' },
  { name: 'rose', color: '#FF8296' }, { name: 'ice', color: '#D9F3FF' },
] as const;
const DIAGONAL = 40 / Math.sqrt(2);
const OFFSETS = [[0, -40], [DIAGONAL, -DIAGONAL], [40, 0], [DIAGONAL, DIAGONAL],
  [0, 40], [-DIAGONAL, DIAGONAL], [-40, 0], [-DIAGONAL, -DIAGONAL]] as const;

export function describeFace(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 127) throw new Error('Invalid face');
  const shape = SHAPES[id % 8];
  const marker = Math.floor(id / 8) % 8;
  const palette = PALETTE[marker];
  const position = POSITIONS[marker];
  const offset = OFFSETS[marker];
  if (!shape || !palette || !position || !offset) throw new Error('Invalid face parts');
  const fill = Math.floor(id / 64) === 0 ? 'solid' : 'outline';
  return { shape, color: palette.color, fill, x: 50 + offset[0], y: 50 + offset[1],
    name: `${palette.name} ${fill} ${shape}, marker ${position}` };
}
