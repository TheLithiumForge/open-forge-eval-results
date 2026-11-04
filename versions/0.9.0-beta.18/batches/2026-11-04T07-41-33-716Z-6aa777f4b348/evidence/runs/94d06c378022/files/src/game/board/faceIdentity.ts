const COLORS = [
  { name: 'cyan', value: '#63E7FF' },
  { name: 'magenta', value: '#FF71D6' },
  { name: 'green', value: '#8BEA7D' },
  { name: 'yellow', value: '#FFE082' },
  { name: 'orange', value: '#FFB064' },
  { name: 'violet', value: '#B49AFF' },
  { name: 'rose', value: '#FF8296' },
  { name: 'ice', value: '#D9F3FF' }
] as const;

const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;

export interface FaceIdentity {
  readonly color: string;
  readonly fill: 'solid' | 'outline';
  readonly shape: (typeof SHAPES)[number];
  readonly marker: (typeof MARKERS)[number];
  readonly name: string;
}

export const FACE_BACKGROUND = '#111625';

export function faceIdentity(id: number): FaceIdentity {
  const color = COLORS[Math.floor(id / 8) % 8];
  const shape = SHAPES[id % 8];
  const marker = MARKERS[Math.floor(id / 8) % 8];
  const fill = id < 64 ? 'solid' : 'outline';
  if (color === undefined || shape === undefined || marker === undefined) throw new RangeError('Unknown face identity');
  return {
    color: color.value, fill, shape, marker,
    name: `${color.name} ${fill} ${shape}, marker ${marker}`
  };
}

export function markerPoint(marker: FaceIdentity['marker']): readonly [number, number] {
  const diagonal = 28.284;
  switch (marker) {
    case 'top': return [50, 10];
    case 'top-right': return [50 + diagonal, 50 - diagonal];
    case 'right': return [90, 50];
    case 'bottom-right': return [50 + diagonal, 50 + diagonal];
    case 'bottom': return [50, 90];
    case 'bottom-left': return [50 - diagonal, 50 + diagonal];
    case 'left': return [10, 50];
    case 'top-left': return [50 - diagonal, 50 - diagonal];
    default: {
      const unreachable: never = marker;
      return unreachable;
    }
  }
}
