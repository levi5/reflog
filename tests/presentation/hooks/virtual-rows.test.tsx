import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useVirtualRows } from "../../../src/presentation/hooks/ui/useVirtualRows"

const ESTIMATE = 20

async function scrollTo(rows: ReturnType<typeof useVirtualRows>, scrollTop: number, clientHeight = 200): Promise<void> {
  await act(async () => {
    rows.onScroll({ currentTarget: { scrollTop, clientHeight } })
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
  })
}

describe("useVirtualRows", () => {
  it("returns every row when virtualization is off", () => {
    const { result } = renderHook(() => useVirtualRows({ count: 5, estimate: ESTIMATE, enabled: false }))
    expect(result.current.items.map((row) => row.index)).toEqual([0, 1, 2, 3, 4])
    expect(result.current.offsetTop).toBe(0)
    expect(result.current.totalHeight).toBe(100)
  })

  it("renders only the visible window plus overscan", async () => {
    const { result } = renderHook(() => useVirtualRows({ count: 1000, estimate: ESTIMATE, overscan: 2 }))
    await scrollTo(result.current, 4000)
    expect(result.current.items[0]?.index).toBe(198)
    expect(result.current.offsetTop).toBe(198 * ESTIMATE)
    expect(result.current.totalHeight).toBe(1000 * ESTIMATE)
    expect(result.current.items.length).toBeLessThan(30)
  })

  it("follows the scroll position", async () => {
    const { result } = renderHook(() => useVirtualRows({ count: 1000, estimate: ESTIMATE, overscan: 2 }))
    await scrollTo(result.current, 0)
    const first = result.current.items[0]?.index
    await scrollTo(result.current, 8000)
    expect(result.current.items[0]?.index).toBeGreaterThan(first ?? 0)
  })

  it("goes back to the top when the reset key changes", async () => {
    const { result, rerender } = renderHook(
      ({ file }: { file: string }) => useVirtualRows({ count: 1000, estimate: ESTIMATE, overscan: 2, resetKey: file }),
      { initialProps: { file: "a.ts" } },
    )
    await scrollTo(result.current, 6000)
    expect(result.current.offsetTop).toBeGreaterThan(0)
    rerender({ file: "b.ts" })
    expect(result.current.offsetTop).toBe(0)
    expect(result.current.items[0]?.index).toBe(0)
  })

  it("keeps the position when the reset key is unchanged", async () => {
    const { result, rerender } = renderHook(
      ({ file }: { file: string }) => useVirtualRows({ count: 1000, estimate: ESTIMATE, overscan: 2, resetKey: file }),
      { initialProps: { file: "a.ts" } },
    )
    await scrollTo(result.current, 6000)
    const offset = result.current.offsetTop
    rerender({ file: "a.ts" })
    expect(result.current.offsetTop).toBe(offset)
  })

  it("resets on demand", async () => {
    const { result } = renderHook(() => useVirtualRows({ count: 1000, estimate: ESTIMATE, overscan: 2 }))
    await scrollTo(result.current, 6000)
    act(() => result.current.reset())
    expect(result.current.offsetTop).toBe(0)
  })
})
