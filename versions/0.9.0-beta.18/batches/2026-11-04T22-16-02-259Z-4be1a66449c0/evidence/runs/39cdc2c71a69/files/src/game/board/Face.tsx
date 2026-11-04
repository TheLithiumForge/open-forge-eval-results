const colors = ['#63E7FF','#FF71D6','#8BEA7D','#FFE082','#FFB064','#B49AFF','#FF8296','#D9F3FF'];
const colorNames = ['cyan','magenta','green','yellow','orange','violet','rose','ice'];
const shapes = ['circle','square','triangle','diamond','star','hexagon','plus','chevron'];
const positions = ['top','top-right','right','bottom-right','bottom','bottom-left','left','top-left'];
const paths = ['', 'M25 25H75V75H25Z', 'M50 25L75 75H25Z', 'M50 25L75 50L50 75L25 50Z', 'M50 25L56 42L74 42L60 53L65 73L50 62L35 73L40 53L26 42L44 42Z', 'M37 25H63L75 50L63 75H37L25 50Z', 'M42 25H58V42H75V58H58V75H42V58H25V42H42Z', 'M25 30L50 50L75 30V50L50 70L25 50Z'];
export function faceName(id: number): string { const marker = Math.floor(id / 8) % 8; return `${colorNames[marker]} ${id < 64 ? 'solid' : 'outline'} ${shapes[id % 8]}, marker ${positions[marker]}`; }
export function Face({ id }: { id: number }) {
  const marker = Math.floor(id / 8) % 8, angle = marker * Math.PI / 4, color = colors[marker], outline = id >= 64;
  const props = { fill: outline ? 'none' : color, stroke: outline ? color : 'none', strokeWidth: 5, strokeLinejoin: 'round' as const };
  return <svg viewBox="0 0 100 100" aria-hidden="true">{id % 8 === 0 ? <circle cx="50" cy="50" r="25" {...props}/> : <path d={paths[id % 8]} {...props}/>}<circle cx={50 + 40 * Math.sin(angle)} cy={50 - 40 * Math.cos(angle)} r="5" fill={color} stroke="#111625" strokeWidth="3"/></svg>;
}
