import { describe, expect, it } from "vitest"

import { prefersReducedMotion, scrollBehavior } from "../../../src/presentation/hooks/ui/scroll"
import { formatElapsed } from "../../../src/presentation/hooks/ui/useElapsed"

function withMatchMedia(matches: boolean | null, run: () => void): void {
  const previous = globalThis.window
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      ...previous,
      matchMedia:
        matches === null
          ? undefined
          : (query: string) => ({
              matches,
              media: query,
              onchange: null,
              addListener: () => undefined,
              removeListener: () => undefined,
              addEventListener: () => undefined,
              removeEventListener: () => undefined,
              dispatchEvent: () => false,
            }),
    },
  })
  try {
    run()
  } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, value: previous })
  }
}

describe("reduced motion", () => {
  it("reports the media query result", () => {
    withMatchMedia(true, () => {
      expect(prefersReducedMotion()).toBe(true)
      expect(scrollBehavior()).toBe("auto")
    })
    withMatchMedia(false, () => {
      expect(prefersReducedMotion()).toBe(false)
      expect(scrollBehavior()).toBe("smooth")
    })
  })

  it("falls back to smooth scrolling when matchMedia is unavailable", () => {
    withMatchMedia(null, () => {
      expect(prefersReducedMotion()).toBe(false)
      expect(scrollBehavior()).toBe("smooth")
    })
  })
})

describe("formatElapsed", () => {
  it("formats sub-minute durations as m:ss", () => {
    expect(formatElapsed(0)).toBe("0:00")
    expect(formatElapsed(9_000)).toBe("0:09")
    expect(formatElapsed(65_000)).toBe("1:05")
    expect(formatElapsed(599_000)).toBe("9:59")
  })

  it("formats hours as h:mm:ss", () => {
    expect(formatElapsed(3_600_000)).toBe("1:00:00")
    expect(formatElapsed(3_661_000)).toBe("1:01:01")
  })

  it("never renders a negative duration", () => {
    expect(formatElapsed(-5_000)).toBe("0:00")
  })
})
