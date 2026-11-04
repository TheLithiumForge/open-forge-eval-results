const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
const positions = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
const colors = ['cyan', 'magenta', 'green', 'yellow', 'orange', 'violet', 'rose', 'ice'] as const;
const palette = ['#63E7FF', '#FF71D6', '#8BEA7D', '#FFE082', '#FFB064', '#B49AFF', '#FF8296', '#D9F3FF'] as const;
const paths = ['', '', 'M50 25 L75 75 H25 Z', 'M50 25 L75 50 L50 75 L25 50 Z', 'M50 25 L56 41 L74 41 L60 52 L65 73 L50 61 L35 73 L40 52 L26 41 L44 41 Z', 'M37 25 H63 L75 50 L63 75 H37 L25 50 Z', 'M41 25 H59 V41 H75 V59 H59 V75 H41 V59 H25 V41 H41 Z', 'M25 29 L50 45 L75 29 V48 L50 71 L25 48 Z'];
export function faceName(id: number): string { const marker = Math.floor(id / 8) % 8; return `${colors[marker]} ${id < 64 ? 'solid' : 'outline'} ${shapes[id % 8]}, marker ${positions[marker]}`; }
export function Face({ id }: { id: number }) {
  const shape = id % 8, marker = Math.floor(id / 8) % 8, color = palette[marker], angle = marker * Math.PI / 4;
  const props = { fill: id < 64 ? color : 'none', stroke: id < 64 ? 'none' : color, strokeWidth: 5, strokeLinejoin: 'round' as const };
  return <svg viewBox="0 0 100 100" aria-hidden="true">{shape === 0 ? <circle cx="50" cy="50" r="25" {...props}/> : shape === 1 ? <rect x="25" y="25" width="50" height="50" {...props}/> : <path d={paths[shape]} {...props}/>}<circle cx={50 + 40 * Math.sin(angle)} cy={50 - 40 * Math.cos(angle)} r="5" fill={color} stroke="#111625" strokeWidth="3"/></svg>;
}
