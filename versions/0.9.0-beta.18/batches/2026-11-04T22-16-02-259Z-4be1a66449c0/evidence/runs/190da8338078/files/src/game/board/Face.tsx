import type { ReactNode } from 'react';

const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
const COLORS = [
  { name: 'cyan', value: '#63E7FF' }, { name: 'magenta', value: '#FF71D6' },
  { name: 'green', value: '#8BEA7D' }, { name: 'yellow', value: '#FFE082' },
  { name: 'orange', value: '#FFB064' }, { name: 'violet', value: '#B49AFF' },
  { name: 'rose', value: '#FF8296' }, { name: 'ice', value: '#D9F3FF' },
] as const;
const DIRECTIONS = [[0, -40], [28.284, -28.284], [40, 0], [28.284, 28.284], [0, 40], [-28.284, 28.284], [-40, 0], [-28.284, -28.284]] as const;
type ShapeName = (typeof SHAPES)[number];

export function faceName(id: number): string {
  const shape = SHAPES[id % 8];
  const marker = Math.floor(id / 8) % 8;
  const color = COLORS[marker];
  if (!shape || !color) throw new RangeError('Face ID must be from 0 through 127.');
  const fill = id < 64 ? 'solid' : 'outline';
  return `${color.name} ${fill} ${shape}, marker ${MARKERS[marker]}`;
}

export function FaceArtwork({ id }: { id: number }) {
  const shape = SHAPES[id % 8];
  const markerIndex = Math.floor(id / 8) % 8;
  const palette = COLORS[markerIndex];
  const direction = DIRECTIONS[markerIndex];
  if (!shape || !palette || !direction) throw new RangeError('Face ID must be from 0 through 127.');
  const color = palette.value;
  const outlined = id >= 64;
  const [dx, dy] = direction;
  return <svg aria-hidden="true" className="face-art" focusable="false" viewBox="0 0 100 100">
    <Shape shape={shape} color={color} outlined={outlined} />
    <circle cx={50 + dx} cy={50 + dy} r="5" fill={color} stroke="#111625" strokeWidth="3" />
  </svg>;
}

export function BackArtwork() {
  return <svg aria-hidden="true" className="back-art" focusable="false" viewBox="0 0 100 100">
    <path d="M50 29 71 50 50 71 29 50Z" fill="none" stroke="#757C9A" strokeWidth="3" />
    <circle cx="50" cy="50" r="3" fill="#757C9A" />
  </svg>;
}

function Shape({ shape, color, outlined }: { shape: ShapeName; color: string; outlined: boolean }) {
  const common = { fill: outlined ? 'none' : color, stroke: outlined ? color : 'none', strokeWidth: 5, strokeLinejoin: 'round' as const };
  const points: Record<ShapeName, ReactNode> = {
    circle: <circle cx="50" cy="50" r="25" {...common} />,
    square: <rect x="25" y="25" width="50" height="50" {...common} />,
    triangle: <polygon points="50,25 75,75 25,75" {...common} />,
    diamond: <polygon points="50,25 75,50 50,75 25,50" {...common} />,
    star: <polygon points={starPoints()} {...common} />,
    hexagon: <polygon points="37.5,25 62.5,25 75,50 62.5,75 37.5,75 25,50" {...common} />,
    plus: <path d="M42 25h16v17h17v16H58v17H42V58H25V42h17Z" {...common} />,
    chevron: <path d="M25 27h17l17 23-17 23H25l17-23Zm20 0h17l17 23-17 23H45l17-23Z" {...common} />,
  };
  return points[shape];
}

function starPoints(): string {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? 25 : 12;
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(' ');
}
