export const FACE_COLORS = [
  { name: 'cyan', value: '#63E7FF', css: 'var(--cyan)' },
  { name: 'magenta', value: '#FF71D6', css: 'var(--magenta)' },
  { name: 'green', value: '#8BEA7D', css: 'var(--green)' },
  { name: 'yellow', value: '#FFE082', css: 'var(--yellow)' },
  { name: 'orange', value: '#FFB064', css: 'var(--orange)' },
  { name: 'violet', value: '#B49AFF', css: 'var(--violet)' },
  { name: 'rose', value: '#FF8296', css: 'var(--rose)' },
  { name: 'ice', value: '#D9F3FF', css: 'var(--ice)' },
] as const;

export const FACE_SHAPES = [
  'circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron',
] as const;

export const MARKER_POSITIONS = [
  'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left',
] as const;

export interface FaceIdentity {
  readonly id: number;
  readonly colorName: (typeof FACE_COLORS)[number]['name'];
  readonly color: (typeof FACE_COLORS)[number]['value'];
  readonly shape: (typeof FACE_SHAPES)[number];
  readonly marker: (typeof MARKER_POSITIONS)[number];
  readonly fill: 'solid' | 'outline';
}

export function faceIdentity(id: number): FaceIdentity {
  const color = FACE_COLORS[Math.floor(id / 8) % FACE_COLORS.length] ?? FACE_COLORS[0];
  const shape = FACE_SHAPES[id % FACE_SHAPES.length] ?? FACE_SHAPES[0];
  const marker = MARKER_POSITIONS[Math.floor(id / 8) % MARKER_POSITIONS.length] ?? MARKER_POSITIONS[0];
  return {
    id,
    colorName: color.name,
    color: color.value,
    shape,
    marker,
    fill: Math.floor(id / 64) === 0 ? 'solid' : 'outline',
  };
}

export function faceName(id: number): string {
  const face = faceIdentity(id);
  return `${face.colorName} ${face.fill} ${face.shape}, marker ${face.marker}`;
}
