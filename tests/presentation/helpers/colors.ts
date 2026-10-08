type Channels = [number, number, number]

function parseChannels(color: string): Channels {
  const functional = /rgba?\(([^)]+)\)/.exec(color)
  if (functional) {
    const [red, green, blue] = functional[1].split(/[,/]/).map((part) => Number.parseFloat(part.trim()))
    return [red, green, blue]
  }
  const digits = color.trim().replace("#", "")
  const isShort = digits.length === 3 || digits.length === 4
  const size = isShort ? 1 : 2
  return [0, size, size * 2].map((offset) =>
    Number.parseInt(digits.slice(offset, offset + size).repeat(isShort ? 2 : 1), 16),
  ) as Channels
}

function alphaOf(color: string): number {
  const functional = /rgba?\(([^)]+)\)/.exec(color)
  if (!functional) return 1
  const parts = functional[1].split(/[,/]/).map((part) => part.trim())
  return parts.length > 3 ? Number.parseFloat(parts[3]) : 1
}

function toHex([red, green, blue]: Channels): string {
  return `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`
}

export function flattenColor(color: string, base: string): string {
  const alpha = alphaOf(color)
  if (alpha >= 1) return toHex(parseChannels(color))
  const top = parseChannels(color)
  const under = parseChannels(base)
  const mix = (over: number, back: number) => alpha * over + (1 - alpha) * back
  return toHex([mix(top[0], under[0]), mix(top[1], under[1]), mix(top[2], under[2])])
}
