import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAutoRefresh } from "../../../src/presentation/hooks/ui/useAutoRefresh"

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true })
}

describe("useAutoRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setHidden(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    setHidden(false)
  })

  it("does not poll while the tab is hidden and resumes when visible", async () => {
    const refresh = vi.fn()
    renderHook(() =>
      useAutoRefresh({ repoRoot: "/repo", busy: false, opening: false, refresh, intervalMs: 1000, focusGapMs: 0 }),
    )
    await vi.advanceTimersByTimeAsync(3000)
    expect(refresh).toHaveBeenCalled()

    refresh.mockClear()
    setHidden(true)
    await vi.advanceTimersByTimeAsync(5000)
    expect(refresh).not.toHaveBeenCalled()

    setHidden(false)
    document.dispatchEvent(new Event("visibilitychange"))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("skips ticks while busy", async () => {
    const refresh = vi.fn()
    const { rerender } = renderHook(
      ({ busy }: { busy: boolean }) =>
        useAutoRefresh({ repoRoot: "/repo", busy, opening: false, refresh, intervalMs: 1000, focusGapMs: 0 }),
      { initialProps: { busy: true } },
    )
    await vi.advanceTimersByTimeAsync(3000)
    expect(refresh).not.toHaveBeenCalled()
    rerender({ busy: false })
    await vi.advanceTimersByTimeAsync(1500)
    expect(refresh).toHaveBeenCalled()
  })
})
