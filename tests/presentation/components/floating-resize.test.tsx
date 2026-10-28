import { cleanup, renderHook, waitFor } from "@testing-library/react"
import type { PointerEvent } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFloatingResize } from "../../../src/presentation/components/Floating/useFloatingResize"

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }))
const pointer = (button = 0) =>
  ({ button, preventDefault: vi.fn(), stopPropagation: vi.fn() }) as unknown as PointerEvent<HTMLElement>

describe("Native workspace resize handle", () => {
  beforeEach(() => invoke.mockReset().mockResolvedValue(undefined))
  afterEach(cleanup)

  it("starts a deliberate native resize and persists its final dimensions", async () => {
    const { result } = renderHook(() => useFloatingResize(vi.fn()))
    result.current.onPointerDown(pointer())
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("start_floating_resize"))
    result.current.onPointerUp()
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("finish_floating_resize"))
  })

  it("finishes on re-entry if the OS consumed pointerup", async () => {
    const { result } = renderHook(() => useFloatingResize(vi.fn()))
    result.current.onPointerDown(pointer())
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("start_floating_resize"))
    result.current.onMouseEnter({ buttons: 0 })
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("finish_floating_resize"))
  })

  it("does not start another drag while one is active or on secondary click", async () => {
    const { result } = renderHook(() => useFloatingResize(vi.fn()))
    result.current.onPointerDown(pointer(2))
    expect(invoke).not.toHaveBeenCalled()
    result.current.onPointerDown(pointer())
    result.current.onPointerDown(pointer())
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it("restores the current screen's default size explicitly", async () => {
    const { result } = renderHook(() => useFloatingResize(vi.fn()))
    result.current.reset()
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("reset_floating_panel_size"))
  })

  it("reports failures without leaving resizing locked", async () => {
    const onError = vi.fn()
    invoke.mockRejectedValueOnce(new Error("Resize failed"))
    const { result } = renderHook(() => useFloatingResize(onError))
    result.current.onPointerDown(pointer())
    await waitFor(() => expect(onError).toHaveBeenCalledWith("Error: Resize failed"))
    result.current.onPointerDown(pointer())
    expect(invoke).toHaveBeenCalledTimes(2)
  })
})
