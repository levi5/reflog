import type { AccentId, AccentOption, Theme } from "../../types"

export const DEFAULT_ACCENT_ID: AccentId = "grape"

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "grape", dark: "#9c90ff", light: "#5b4ee0" },
  { id: "blue", dark: "#3b9eff", light: "#1d4ed8" },
  { id: "teal", dark: "#4cd7f6", light: "#096057" },
  { id: "green", dark: "#4edea3", light: "#076a46" },
  { id: "amber", dark: "#fbbf24", light: "#7d4e00" },
  { id: "red", dark: "#ff5f5f", light: "#b91c1c" },
  { id: "orange", dark: "#fb9234", light: "#b34406" },
]

export function isAccentId(value: string): value is AccentId {
  return ACCENT_OPTIONS.some((option) => option.id === value)
}

export function isLightTheme(theme: Theme): boolean {
  return theme === "light"
}

export function resolveAccentHex(accent: AccentId, theme: Theme): string {
  const option = ACCENT_OPTIONS.find((entry) => entry.id === accent) ?? ACCENT_OPTIONS[0]
  return isLightTheme(theme) ? option.light : option.dark
}

function channel(value: number): number {
  const srgb = value / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "")
  const full =
    value.length === 3
      ? value
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : value.padEnd(6, "0").slice(0, 6)
  const red = Number.parseInt(full.slice(0, 2), 16)
  const green = Number.parseInt(full.slice(2, 4), 16)
  const blue = Number.parseInt(full.slice(4, 6), 16)
  if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) return 0
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

const DARK_ON_ACCENT = "#12121a"
const LIGHT_ON_ACCENT = "#ffffff"

function mix(hex: string, target: string, ratio: number): string {
  const value = hex.replace("#", "")
  const parse = (offset: number) => Number.parseInt(value.slice(offset, offset + 2), 16)
  const targetDigits = target.replace("#", "")
  const parseTarget = (offset: number) => Number.parseInt(targetDigits.slice(offset, offset + 2), 16)
  const out = [0, 2, 4].map((offset) => {
    const from = parse(offset)
    const to = parseTarget(offset)
    return Math.round(from + (to - from) * ratio)
      .toString(16)
      .padStart(2, "0")
  })
  return `#${out.join("")}`
}

export function readableTextOn(background: string): string {
  return contrastRatio(DARK_ON_ACCENT, background) >= contrastRatio(LIGHT_ON_ACCENT, background)
    ? DARK_ON_ACCENT
    : LIGHT_ON_ACCENT
}

export function ensureContrast(background: string, foreground: string, min = 4.5): string {
  if (contrastRatio(foreground, background) >= min) return background
  const target = readableTextOn(background) === LIGHT_ON_ACCENT ? "#000000" : "#ffffff"
  let current = background
  for (let step = 1; step <= 20; step += 1) {
    current = mix(background, target, step / 20)
    if (contrastRatio(foreground, current) >= min) return current
  }
  return target
}

export const MIN_TEXT_CONTRAST = 4.5
