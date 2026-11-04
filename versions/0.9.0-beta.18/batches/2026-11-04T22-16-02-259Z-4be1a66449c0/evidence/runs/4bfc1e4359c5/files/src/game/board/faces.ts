export const COLORS = ["#63E7FF", "#FF71D6", "#8BEA7D", "#FFE082", "#FFB064", "#B49AFF", "#FF8296", "#D9F3FF"] as const;
export const COLOR_NAMES = ["cyan", "magenta", "green", "yellow", "orange", "violet", "rose", "ice"] as const;
export const SHAPES = ["circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron"] as const;
export const MARKERS = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"] as const;

export function faceName(faceId: number): string {
  const shape = SHAPES[faceId % 8]!;
  const marker = Math.floor(faceId / 8) % 8;
  const fill = faceId < 64 ? "solid" : "outline";
  return `${COLOR_NAMES[marker]!} ${fill} ${shape}, marker ${MARKERS[marker]!}`;
}
