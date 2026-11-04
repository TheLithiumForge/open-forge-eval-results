export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
export const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
export const COLORS = ['cyan', 'magenta', 'green', 'yellow', 'orange', 'violet', 'rose', 'ice'] as const;
export const PALETTE = ['#63E7FF', '#FF71D6', '#8BEA7D', '#FFE082', '#FFB064', '#B49AFF', '#FF8296', '#D9F3FF'] as const;

export function faceName(id: number): string {
  const marker = Math.floor(id / 8) % 8;
  return `${COLORS[marker]} ${id < 64 ? 'solid' : 'outline'} ${SHAPES[id % 8]}, marker ${MARKERS[marker]}`;
}
