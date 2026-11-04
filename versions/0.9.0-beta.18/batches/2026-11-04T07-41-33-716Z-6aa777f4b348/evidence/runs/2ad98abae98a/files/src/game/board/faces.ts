export const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const palette = [
  ['cyan', '#63E7FF'], ['magenta', '#FF71D6'], ['green', '#8BEA7D'], ['yellow', '#FFE082'],
  ['orange', '#FFB064'], ['violet', '#B49AFF'], ['rose', '#FF8296'], ['ice', '#D9F3FF'],
] as const;
export const markers = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export function faceParts(id: number) {
  const marker = Math.floor(id / 8) % 8;
  const color = palette[marker];
  const shape = shapes[id % 8];
  const position = markers[marker];
  if (!color || !shape || !position || !Number.isInteger(id) || id < 0 || id > 127) throw new Error('Invalid face');
  const angle = marker * Math.PI / 4;
  return { shape, color: color[1], outline: id >= 64,
    x: 50 + Math.sin(angle) * 40, y: 50 - Math.cos(angle) * 40,
    name: `${color[0]} ${id >= 64 ? 'outline' : 'solid'} ${shape}, marker ${position}` };
}
