export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const
export const POSITIONS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const
export const COLORS = [
  { name: 'cyan', value: '#63E7FF' },
  { name: 'magenta', value: '#FF71D6' },
  { name: 'green', value: '#8BEA7D' },
  { name: 'yellow', value: '#FFE082' },
  { name: 'orange', value: '#FFB064' },
  { name: 'violet', value: '#B49AFF' },
  { name: 'rose', value: '#FF8296' },
  { name: 'ice', value: '#D9F3FF' },
] as const

export const SHAPE_POINTS = [
  '', '27,27 73,27 73,73 27,73', '50,26 74,72 26,72', '50,26 74,50 50,74 26,50',
  '50,26 56,43 74,43 60,54 66,73 50,62 34,73 40,54 26,43 44,43',
  '50,26 71,38 71,62 50,74 29,62 29,38',
  '41,26 59,26 59,41 74,41 74,59 59,59 59,74 41,74 41,59 26,59 26,41 41,41',
  '27,26 73,50 27,74 43,50',
] as const

export type Face = Readonly<{
  color: string
  colorName: string
  shape: (typeof SHAPES)[number]
  shapeIndex: number
  marker: (typeof POSITIONS)[number]
  fill: 'solid' | 'outline'
  markerX: number
  markerY: number
  name: string
}>

const MARKER_VECTORS = [
  [0, -40], [28.284, -28.284], [40, 0], [28.284, 28.284],
  [0, 40], [-28.284, 28.284], [-40, 0], [-28.284, -28.284],
] as const

export function describeFace(id: number): Face | null {
  if (!Number.isSafeInteger(id) || id < 0 || id > 127) return null
  const shapeIndex = id % 8
  const markerIndex = Math.floor(id / 8) % 8
  const color = COLORS[markerIndex]
  const shape = SHAPES[shapeIndex]
  const marker = POSITIONS[markerIndex]
  const vector = MARKER_VECTORS[markerIndex]
  if (color === undefined || shape === undefined || marker === undefined || vector === undefined) return null
  const fill = id < 64 ? 'solid' : 'outline'
  return {
    color: color.value,
    colorName: color.name,
    shape,
    shapeIndex,
    marker,
    fill,
    markerX: 50 + vector[0],
    markerY: 50 + vector[1],
    name: `${color.name} ${fill} ${shape}, marker ${marker}`,
  }
}
