import { createContext, type ReactNode, useContext, useMemo } from "react"
import { DEFAULT_FONT_SIZE, type FontSize, MAX_FONT_SIZE, MIN_FONT_SIZE } from "../../../types"
import { clamp } from "../../../shared/utils/number"
import { usePersistentSetting, versionedKey } from "../../../infrastructure/storage/versioned-storage"

const FONT_SIZE_KEY = "font-size"
export const FONT_SIZE_STORAGE_KEY = versionedKey(FONT_SIZE_KEY)

const FONT_SIZE_PRESETS: Record<string, number> = {
  small: 12,
  medium: 13,
  large: 15,
}

function clampFontSize(size: number): FontSize {
  return clamp(size, MIN_FONT_SIZE, MAX_FONT_SIZE)
}

function parseFontSize(raw: string): FontSize {
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) return DEFAULT_FONT_SIZE
  return clampFontSize(FONT_SIZE_PRESETS[raw] ?? parsed)
}

function applyFontSizeVars(fontSize: FontSize): void {
  document.documentElement.style.setProperty("--app-fs", `${fontSize}px`)
  document.documentElement.style.setProperty("--font-zoom", (fontSize / DEFAULT_FONT_SIZE).toFixed(3))
}

export interface UiContextValue {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  minFontSize: number
  maxFontSize: number
  defaultFontSize: number
}

const UiContext = createContext<UiContextValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = usePersistentSetting<FontSize>(FONT_SIZE_KEY, DEFAULT_FONT_SIZE, {
    parse: parseFontSize,
    normalize: (nextSize) => clampFontSize(nextSize),
    apply: applyFontSizeVars,
  })

  const value = useMemo<UiContextValue>(
    () => ({
      fontSize,
      setFontSize,
      minFontSize: MIN_FONT_SIZE,
      maxFontSize: MAX_FONT_SIZE,
      defaultFontSize: DEFAULT_FONT_SIZE,
    }),
    [fontSize, setFontSize],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi(): UiContextValue {
  const context = useContext(UiContext)
  if (!context) {
    throw new Error("useUi must be used within UiProvider")
  }
  return context
}
