export const TICK = { fill: '#8A94A8', fontSize: 11 }
export const AXIS = 'rgba(255,255,255,0.15)'
export const GRID = 'rgba(255,255,255,0.06)'
export const FLAME = '#FF6B2C'
export const BLUE = '#4CC9F0'

export const TOOLTIP = {
  background: 'rgba(11,15,26,0.92)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#E8ECF4',
  fontSize: 12,
}

export function axisLabel(value: string, side: 'bottom' | 'left' | 'right', color = '#8A94A8') {
  if (side === 'bottom') {
    return { value, position: 'insideBottom' as const, offset: -12, fill: color, fontSize: 11 }
  }
  return {
    value,
    angle: side === 'left' ? -90 : 90,
    position: side === 'left' ? ('insideLeft' as const) : ('insideRight' as const),
    fill: color,
    fontSize: 11,
    style: { textAnchor: 'middle' as const },
  }
}