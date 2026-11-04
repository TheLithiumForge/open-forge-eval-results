export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
const PALETTE = [
  ['cyan', '#63E7FF'], ['magenta', '#FF71D6'], ['green', '#8BEA7D'], ['yellow', '#FFE082'],
  ['orange', '#FFB064'], ['violet', '#B49AFF'], ['rose', '#FF8296'], ['ice', '#D9F3FF'],
] as const;
const DIAGONAL = 40 / Math.sqrt(2);
const OFFSETS = [[0, -40], [DIAGONAL, -DIAGONAL], [40, 0], [DIAGONAL, DIAGONAL],
  [0, 40], [-DIAGONAL, DIAGONAL], [-40, 0], [-DIAGONAL, -DIAGONAL]] as const;
export type Shape = (typeof SHAPES)[number];

export function faceIdentity(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 127) throw new Error('Invalid face');
  const shape = SHAPES[id % 8];
  const markerIndex = Math.floor(id / 8) % 8;
  const marker = MARKERS[markerIndex];
  const palette = PALETTE[markerIndex];
  const offset = OFFSETS[markerIndex];
  if (!shape || !marker || !palette || !offset) throw new Error('Invalid face identity');
  const fill = id < 64 ? 'solid' : 'outline';
  return { shape, marker, fill, color: palette[1], markerX: 50 + offset[0], markerY: 50 + offset[1],
    name: `${palette[0]} ${fill} ${shape}, marker ${marker}` };
}
