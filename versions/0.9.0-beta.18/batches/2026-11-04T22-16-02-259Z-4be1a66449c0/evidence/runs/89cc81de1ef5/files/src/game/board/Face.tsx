const COLORS = [
  ['cyan', '#63E7FF'], ['magenta', '#FF71D6'], ['green', '#8BEA7D'], ['yellow', '#FFE082'],
  ['orange', '#FFB064'], ['violet', '#B49AFF'], ['rose', '#FF8296'], ['ice', '#D9F3FF'],
] as const;
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const MARKERS = [
  ['top', 50, 10], ['top-right', 78.284, 21.716], ['right', 90, 50], ['bottom-right', 78.284, 78.284],
  ['bottom', 50, 90], ['bottom-left', 21.716, 78.284], ['left', 10, 50], ['top-left', 21.716, 21.716],
] as const;

function Shape({ id, fill, color }: { id: number; fill: boolean; color: string }) {
  const common = { fill: fill ? color : 'none', stroke: fill ? 'none' : color, strokeWidth: fill ? undefined : 5, strokeLinejoin: 'round' as const };
  switch (id) {
    case 0: return <circle cx="50" cy="50" r="23" {...common} />;
    case 1: return <rect x="27" y="27" width="46" height="46" rx="2" {...common} />;
    case 2: return <path d="M50 26 75 72H25Z" {...common} />;
    case 3: return <path d="M50 25 75 50 50 75 25 50Z" {...common} />;
    case 4: return <path d="m50 25 7.4 15 16.6 2.4-12 11.7 2.8 16.5L50 62.8l-14.8 7.8L38 54.1 26 42.4l16.6-2.4Z" {...common} />;
    case 5: return <path d="m37.5 27 25 0 12.5 23-12.5 23h-25L25 50Z" {...common} />;
    case 6: return <path d="M43 25h14v18h18v14H57v18H43V57H25V43h18Z" {...common} />;
    case 7: return <path d="M28 27h18l27 23-27 23H28l27-23Z" {...common} />;
  }
}

export function faceName(faceId: number): string {
  const [colorName] = COLORS[faceId % 8] ?? COLORS[0];
  const fill = Math.floor(faceId / 64) === 0 ? 'solid' : 'outline';
  const shape = SHAPES[faceId % 8] ?? 'circle';
  const [marker] = MARKERS[Math.floor(faceId / 8) % 8] ?? MARKERS[0];
  return `${colorName} ${fill} ${shape}, marker ${marker}`;
}

export function Face({ faceId }: { faceId: number }) {
  const color = COLORS[faceId % 8]?.[1] ?? COLORS[0][1];
  const fill = Math.floor(faceId / 64) === 0;
  const [markerName, markerX, markerY] = MARKERS[Math.floor(faceId / 8) % 8] ?? MARKERS[0];
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <title>{faceName(faceId)}</title>
      <Shape id={faceId % 8} fill={fill} color={color} />
      <circle cx={markerX} cy={markerY} r="5" fill={color} stroke="#111625" strokeWidth="3" data-marker={markerName} />
    </svg>
  );
}
