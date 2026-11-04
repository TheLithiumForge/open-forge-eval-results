const COLORS = [
  ['Cyan', '#63E7FF'], ['Magenta', '#FF71D6'], ['Green', '#8BEA7D'], ['Yellow', '#FFE082'],
  ['Orange', '#FFB064'], ['Violet', '#B49AFF'], ['Rose', '#FF8296'], ['Ice', '#D9F3FF'],
] as const
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const
const MARKERS = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const
const DIRECTIONS = [
  [0, -40], [28.284, -28.284], [40, 0], [28.284, 28.284],
  [0, 40], [-28.284, 28.284], [-40, 0], [-28.284, -28.284],
] as const

export type ShapeName = (typeof SHAPES)[number]
export interface FaceData {
  name: string
  color: string
  shape: ShapeName
  outline: boolean
  markerX: number
  markerY: number
}

export function faceData(id: number): FaceData {
  const shape = SHAPES[id % 8] ?? SHAPES[0]
  const markerIndex = Math.floor(id / 8) % 8
  const color = COLORS[markerIndex] ?? COLORS[0]
  const marker = MARKERS[markerIndex] ?? MARKERS[0]
  const fill = id >= 64 ? 'outline' : 'solid'
  const direction = DIRECTIONS[markerIndex] ?? DIRECTIONS[0]
  return {
    name: `${color[0].toLowerCase()} ${fill} ${shape}, marker ${marker}`,
    color: color[1], shape, outline: id >= 64,
    markerX: 50 + direction[0], markerY: 50 + direction[1],
  }
}

export function starPoints(): string {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? 25 : 11
    const angle = -Math.PI / 2 + index * Math.PI / 5
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`
  }).join(' ')
}
