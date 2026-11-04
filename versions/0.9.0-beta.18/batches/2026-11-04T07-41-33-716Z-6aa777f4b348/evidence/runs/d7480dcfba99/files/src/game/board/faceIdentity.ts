export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const PALETTE = [
  ['cyan', '#63E7FF'], ['magenta', '#FF71D6'], ['green', '#8BEA7D'], ['yellow', '#FFE082'],
  ['orange', '#FFB064'], ['violet', '#B49AFF'], ['rose', '#FF8296'], ['ice', '#D9F3FF'],
] as const;

export function faceIdentity(id: number) {
  const marker = Math.floor(id / 8) % 8;
  const shape = SHAPES[id % 8];
  const position = MARKERS[marker];
  const palette = PALETTE[marker];
  if (!shape || !position || !palette) throw new Error('Invalid face');
  const fill = id < 64 ? 'solid' : 'outline';
  const angle = marker * Math.PI / 4;
  return { shape, fill, color: palette[1], x: 50 + 40 * Math.sin(angle), y: 50 - 40 * Math.cos(angle),
    name: `${palette[0]} ${fill} ${shape}, marker ${position}` };
}
