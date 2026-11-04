const shapes = ['circle','square','triangle','diamond','star','hexagon','plus','chevron'] as const;
const positions = ['top','top-right','right','bottom-right','bottom','bottom-left','left','top-left'] as const;
const colors = ['cyan','magenta','green','yellow','orange','violet','rose','ice'] as const;
const palette = ['#63E7FF','#FF71D6','#8BEA7D','#FFE082','#FFB064','#B49AFF','#FF8296','#D9F3FF'];
const paths = ['', 'M25 25H75V75H25Z', 'M50 25L75 75H25Z', 'M50 25L75 50L50 75L25 50Z', 'M50 25L57 42L75 43L61 55L66 75L50 64L34 75L39 55L25 43L43 42Z', 'M37 25H63L75 50L63 75H37L25 50Z', 'M42 25H58V42H75V58H58V75H42V58H25V42H42Z', 'M25 30L50 46L75 30V48L50 69L25 48Z'];
export function faceName(id: number): string {
  const marker = Math.floor(id / 8) % 8;
  return `${colors[marker]} ${id < 64 ? 'solid' : 'outline'} ${shapes[id % 8]}, marker ${positions[marker]}`;
}
export function Face({ id }: { id: number }) {
  const shape = id % 8, marker = Math.floor(id / 8) % 8, color = palette[marker];
  const angle = marker * Math.PI / 4, x = 50 + 40 * Math.sin(angle), y = 50 - 40 * Math.cos(angle);
  const props = { fill: id < 64 ? color : 'none', stroke: id < 64 ? 'none' : color, strokeWidth: 5, strokeLinejoin: 'round' as const };
  return <svg viewBox="0 0 100 100" aria-hidden="true">{shape === 0 ? <circle cx="50" cy="50" r="25" {...props}/> : <path d={paths[shape]} {...props}/>}<circle cx={x} cy={y} r="5" fill={color} stroke="#111625" strokeWidth="3"/></svg>;
}
