import { type KeyboardEvent, type PointerEvent as ReactPointerEvent, useCallback, useState } from "react"
import { clamp } from "../../../shared/utils/number"
import { debounce, readVersionedRaw, writeVersionedRaw } from "../../../infrastructure/storage/versioned-storage"

interface Options {
  axis: "x" | "y"
  initial: number
  min: number
  max: number
  storageKey: string
  invert?: boolean
}

export interface GripProps {
  role: "slider"
  tabIndex: number
  "aria-orientation": "horizontal" | "vertical"
  "aria-valuenow": number
  "aria-valuemin": number
  "aria-valuemax": number
  "aria-label": string
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onDoubleClick: () => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
}

function loadSize(key: string, initial: number, min: number, max: number): number {
  try {
    const raw = readVersionedRaw(`size.${key}`)
    if (!raw) return initial
    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) return initial
    return clamp(parsed, min, max)
  } catch {
    return initial
  }
}

const debouncedPersistSize = debounce((key: string, value: number) => {
  persistSize(key, value)
}, 300)

function persistSize(key: string, value: number): void {
  try {
    writeVersionedRaw(`size.${key}`, String(value))
  } catch {
    return
  }
}

export function useResizable({ axis, initial, min, max, storageKey, invert }: Options) {
  const [size, setSize] = useState(() => loadSize(storageKey, initial, min, max))

  const reset = useCallback(() => {
    setSize(initial)
    persistSize(storageKey, initial)
  }, [initial, storageKey])

  const clampSize = useCallback((value: number) => clamp(value, min, max), [min, max])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      const startPos = axis === "x" ? e.clientX : e.clientY
      const startSize = size
      const dir = invert ? -1 : 1
      let current = startSize
      let disposed = false
      const move = (ev: PointerEvent) => {
        if (disposed) return
        const pos = axis === "x" ? ev.clientX : ev.clientY
        current = clampSize(startSize + (pos - startPos) * dir)
        setSize(current)
      }
      const up = () => {
        if (disposed) return
        disposed = true
        debouncedPersistSize(storageKey, current)
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        window.removeEventListener("pointercancel", up)
      }
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
      window.addEventListener("pointercancel", up)
    },
    [axis, clampSize, invert, size, storageKey],
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const step = e.shiftKey ? 40 : 8
      const dir = invert ? -1 : 1
      let next: number | null = null
      if (axis === "x" && e.key === "ArrowLeft") next = size - step * dir
      if (axis === "x" && e.key === "ArrowRight") next = size + step * dir
      if (axis === "y" && e.key === "ArrowUp") next = size - step * dir
      if (axis === "y" && e.key === "ArrowDown") next = size + step * dir
      if (next === null) return
      e.preventDefault()
      const clamped = clampSize(next)
      setSize(clamped)
      persistSize(storageKey, clamped)
    },
    [axis, clampSize, invert, size, storageKey],
  )

  const grip: GripProps = {
    role: "slider",
    tabIndex: 0,
    "aria-orientation": axis === "x" ? "vertical" : "horizontal",
    "aria-valuenow": Math.round(size),
    "aria-valuemin": min,
    "aria-valuemax": max,
    "aria-label": storageKey,
    onPointerDown,
    onDoubleClick: reset,
    onKeyDown,
  }

  return { size, reset, grip }
}
