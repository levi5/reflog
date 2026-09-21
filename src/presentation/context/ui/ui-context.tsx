import { _Maybe } from "funcio"
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { FontSize } from "../../../types"
import { clamp } from "../../../shared/utils/number"
import {
  debounce,
  readVersionedRaw,
  versionedKey,
  writeVersionedRaw,
} from "../../../infrastructure/storage/versioned-storage"

const FONT_SIZE_KEY = "font-size"
export const FONT_SIZE_STORAGE_KEY = versionedKey(FONT_SIZE_KEY)
const DEFAULT_FONT_SIZE: FontSize = 13
const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 20

const FONT_SIZE_PRESETS: Record<string, number> = {
  small: 12,
  medium: 13,
  large: 15,
}

function readFontSizeStorage(): FontSize {
  const stored = readVersionedRaw(FONT_SIZE_KEY)
  return _Maybe
    .of(stored)
    .map((raw) => {
      if (raw === null) return DEFAULT_FONT_SIZE
      const preset = FONT_SIZE_PRESETS[raw]
      const parsed = Number.parseInt(raw, 10)
      const size = preset ?? (Number.isNaN(parsed) ? DEFAULT_FONT_SIZE : parsed)
      return clamp(size, MIN_FONT_SIZE, MAX_FONT_SIZE)
    })
    .getOrElse(DEFAULT_FONT_SIZE)
}

const debouncedWriteFontSize = debounce((fontSize: FontSize) => {
  writeVersionedRaw(FONT_SIZE_KEY, String(fontSize))
}, 300)

export interface UiContextValue {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  minFontSize: number
  maxFontSize: number
  defaultFontSize: number
}

const UiContext = createContext<UiContextValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(readFontSizeStorage)

  const setFontSize = useCallback((nextSize: FontSize) => {
    const clamped = clamp(nextSize, MIN_FONT_SIZE, MAX_FONT_SIZE)
    setFontSizeState(clamped)
  }, [])

  useEffect(() => {
    debouncedWriteFontSize(fontSize)
    document.documentElement.style.setProperty("--app-fs", `${fontSize}px`)
    document.documentElement.style.setProperty("--font-zoom", `${(fontSize / DEFAULT_FONT_SIZE).toFixed(3)}`)
  }, [fontSize])

  useEffect(() => {
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key !== FONT_SIZE_STORAGE_KEY || storageEvent.newValue === null) return
      const parsed = Number.parseInt(storageEvent.newValue, 10)
      if (!Number.isNaN(parsed)) setFontSizeState(clamp(parsed, MIN_FONT_SIZE, MAX_FONT_SIZE))
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

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
