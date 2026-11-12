const CENTER = 140

function point(radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180
  return {
    x: Number((CENTER + radius * Math.cos(radians)).toFixed(4)),
    y: Number((CENTER + radius * Math.sin(radians)).toFixed(4)),
  }
}

export function radialSector(index: number, count: number) {
  const angle = 360 / count
  const start = -90 + index * angle + 0.35
  const end = -90 + (index + 1) * angle - 0.35
  const a = point(139, start)
  const b = point(139, end)
  const c = point(42, end)
  const d = point(42, start)
  const large = end - start > 180 ? 1 : 0
  return {
    path: `M ${a.x} ${a.y} A 139 139 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A 42 42 0 ${large} 0 ${d.x} ${d.y} Z`,
    label: point(92, -90 + (index + 0.5) * angle),
  }
}
