import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFloatingViewport } from "../../../src/presentation/components/Floating/useFloatingViewport"

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }))

describe("Native floating WebView scale synchronization", () => {
  let resized: () => void
  const disconnect = vi.fn()
  beforeEach(() => {
    invoke.mockReset().mockResolvedValue(undefined)
    disconnect.mockClear()
    vi.stubGlobal("innerWidth", 250)
    vi.stubGlobal("innerHeight", 250)
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal("cancelAnimationFrame", vi.fn())
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback
        }
        observe() {}
        disconnect = disconnect
      },
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("reports CSS viewport pixels rather than assuming monitor DPR", async () => {
    renderHook(() => useFloatingViewport(vi.fn()))
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("sync_floating_viewport", { cssWidth: 250, cssHeight: 250 }),
    )
  })

  it("resynchronizes when the native workspace or display scale changes", async () => {
    const onError = vi.fn()
    const { unmount } = renderHook(() => useFloatingViewport(onError))
    vi.stubGlobal("innerWidth", 460)
    vi.stubGlobal("innerHeight", 640)
    resized()
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("sync_floating_viewport", { cssWidth: 460, cssHeight: 640 }),
    )
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
