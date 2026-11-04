import './Face.css';

const COLORS = ['#63E7FF', '#FF71D6', '#8BEA7D', '#FFE082', '#FFB064', '#B49AFF', '#FF8296', '#D9F3FF'] as const;
const COLOR_NAMES = ['cyan', 'magenta', 'green', 'yellow', 'orange', 'violet', 'rose', 'ice'] as const;
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
const DIRECTIONS = [[0, -40], [28.284, -28.284], [40, 0], [28.284, 28.284],
  [0, 40], [-28.284, 28.284], [-40, 0], [-28.284, -28.284]] as const;
const STAR = '50,26 56,43 74,43 60,54 66,72 50,61 34,72 40,54 26,43 44,43';
const PLUS = '42,26 58,26 58,42 74,42 74,58 58,58 58,74 42,74 42,58 26,58 26,42 42,42';
const CHEVRON = '30,26 53,26 75,50 53,74 30,74 52,50';

export function getFaceName(id: number): string {
  const shape = SHAPES[id % 8];
  const marker = Math.floor(id / 8) % 8;
  const fill = Math.floor(id / 64) === 0 ? 'solid' : 'outline';
  const color = COLOR_NAMES[marker];
  const position = MARKERS[marker];
  return `${color} ${fill} ${shape}, marker ${position}`;
}

function FaceShape({ shape, color, outline }: { shape: number; color: string; outline: boolean }) {
  const common = { fill: outline ? 'none' : color, stroke: outline ? color : 'none', strokeWidth: outline ? 5 : 0 };
  switch (shape) {
    case 0: return <circle cx="50" cy="50" r="24" {...common} />;
    case 1: return <rect x="26" y="26" width="48" height="48" {...common} />;
    case 2: return <polygon points="50,26 75,74 25,74" {...common} />;
    case 3: return <polygon points="50,25 75,50 50,75 25,50" {...common} />;
    case 4: return <polygon points={STAR} {...common} />;
    case 5: return <polygon points="35,26 65,26 75,50 65,74 35,74 25,50" {...common} />;
    case 6: return <polygon points={PLUS} {...common} />;
    case 7: return <polygon points={CHEVRON} {...common} />;
  }
}

export function Face({ id }: { id: number }) {
  const marker = Math.floor(id / 8) % 8;
  const offsets = DIRECTIONS[marker] ?? DIRECTIONS[0];
  const color = COLORS[marker] ?? COLORS[0];
  const fill = Math.floor(id / 64) === 0;
  const name = getFaceName(id);
  return (
    <svg className="face-art" viewBox="0 0 100 100" role="img" aria-label={name}>
      <FaceShape shape={id % 8} color={color} outline={!fill} />
      <circle cx={50 + offsets[0]} cy={50 + offsets[1]} r="5" fill={color} stroke="#111625" strokeWidth="3" />
    </svg>
  );
}
