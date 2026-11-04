const palette = ["#63E7FF", "#FF71D6", "#8BEA7D", "#FFE082", "#FFB064", "#B49AFF", "#FF8296", "#D9F3FF"] as const;
const colors = ["cyan", "magenta", "green", "yellow", "orange", "violet", "rose", "ice"] as const;
const shapes = ["circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron"] as const;
const positions = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"] as const;

function shapePoints(shape: number): string {
  if (shape === 2) return "50,25 75,75 25,75";
  if (shape === 3) return "50,25 75,50 50,75 25,50";
  if (shape === 4) {
    return Array.from({ length: 10 }, (_, index) => {
      const radius = index % 2 === 0 ? 25 : 11;
      const angle = (Math.PI * index) / 5 - Math.PI / 2;
      return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
    }).join(" ");
  }
  if (shape === 5) return "50,25 72,37 72,63 50,75 28,63 28,37";
  if (shape === 6) return "43,25 57,25 57,43 75,43 75,57 57,57 57,75 43,75 43,57 25,57 25,43 43,43";
  return "27,25 69,50 27,75 27,62 49,50 27,38";
}

function Shape({ shape, color, outline }: Readonly<{ shape: number; color: string; outline: boolean }>) {
  const fill = outline ? "none" : color;
  const stroke = outline ? color : "none";
  const strokeWidth = outline ? 5 : undefined;
  if (shape === 0) return <circle cx="50" cy="50" r="25" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  if (shape === 1) return <rect x="25" y="25" width="50" height="50" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  return <polygon points={shapePoints(shape)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

export function faceName(face: number): string {
  const shape = shapes[face % 8];
  const color = colors[Math.floor(face / 8) % 8];
  const fill = face >= 64 ? "outline" : "solid";
  const position = positions[Math.floor(face / 8) % 8];
  return `${color} ${fill} ${shape}, marker ${position}`;
}

export function FaceArtwork({ face }: Readonly<{ face: number }>) {
  const marker = Math.floor(face / 8) % 8;
  const diagonal = 40 / Math.sqrt(2);
  const offsets = [
    [0, -40], [diagonal, -diagonal], [40, 0], [diagonal, diagonal],
    [0, 40], [-diagonal, diagonal], [-40, 0], [-diagonal, -diagonal]
  ] as const;
  const offset = offsets[marker] ?? offsets[0];
  const color = palette[marker] ?? palette[0];
  return (
    <svg aria-hidden="true" className="face-art" viewBox="0 0 100 100">
      <Shape shape={face % 8} color={color} outline={face >= 64} />
      <circle cx={50 + offset[0]} cy={50 + offset[1]} r="5" fill={color} stroke="#111625" strokeWidth="3" />
    </svg>
  );
}

export function CardBack() {
  return (
    <svg aria-hidden="true" className="card-back-art" viewBox="0 0 100 100">
      <path d="M50 30 70 50 50 70 30 50Z" fill="none" stroke="#757C9A" strokeWidth="3" />
    </svg>
  );
}
