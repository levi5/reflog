import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import type { PointerEvent } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFloatingDrag } from "../../../src/presentation/components/Floating/useFloatingDrag"

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@tauri-apps/api/core", () => ({ invoke, isTauri: () => true }))

function pointer(screenX: number, screenY: number, buttons = 1, button = 0) {
  return { screenX, screenY, buttons, button } as PointerEvent<HTMLElement>
}

describe("Intentional floating window drag", () => {
  beforeEach(() => invoke.mockReset().mockResolvedValue(undefined))
  afterEach(cleanup)

  it("does not drag on a click or minor pointer movement", async () => {
    const { result } = renderHook(() => useFloatingDrag(vi.fn()))
    result.current.onPointerDown(pointer(100, 100))
    result.current.onPointerMove(pointer(102, 102))
    result.current.onPointerUp()
    await act(async () => {})
    expect(invoke).not.toHaveBeenCalled()
  })

  it("starts once after the movement threshold and saves the anchor on release", async () => {
    const { result } = renderHook(() => useFloatingDrag(vi.fn()))
    result.current.onPointerDown(pointer(100, 100))
    result.current.onPointerMove(pointer(110, 100))
    result.current.onPointerMove(pointer(120, 100))
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("drag_floating"))
    expect(result.current.dragging.current).toBe(true)
    expect(invoke).toHaveBeenCalledTimes(1)
    result.current.onPointerUp()
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("finish_floating_drag"))
    await waitFor(() => expect(result.current.dragging.current).toBe(false))
  })

  it("finishes on re-entry when native dragging consumed pointerup", async () => {
    const { result } = renderHook(() => useFloatingDrag(vi.fn()))
    result.current.onPointerDown(pointer(100, 100))
    result.current.onPointerMove(pointer(110, 100))
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("drag_floating"))
    result.current.onPointerCancel()
    result.current.onMouseEnter({ buttons: 0 })
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("finish_floating_drag"))
    await waitFor(() => expect(result.current.dragging.current).toBe(false))
  })

  it("waits for hover resizing before beginning a native drag", async () => {
    let finishResize: (() => void) | undefined
    const pending = new Promise<void>((resolve) => {
      finishResize = resolve
    })
    const { result } = renderHook(() => useFloatingDrag(vi.fn(), () => pending))
    result.current.onPointerDown(pointer(100, 100))
    result.current.onPointerMove(pointer(110, 100))
    expect(invoke).not.toHaveBeenCalled()
    finishResize?.()
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("drag_floating"))
  })

  it("reports native drag failures and releases the interaction lock", async () => {
    invoke.mockRejectedValueOnce(new Error("Drag failed"))
    const onError = vi.fn()
    const { result } = renderHook(() => useFloatingDrag(onError))
    result.current.onPointerDown(pointer(100, 100))
    result.current.onPointerMove(pointer(110, 100))
    await waitFor(() => expect(onError).toHaveBeenCalledWith("Error: Drag failed"))
    expect(result.current.dragging.current).toBe(false)
  })

  it("ignores the secondary button", async () => {
    const { result } = renderHook(() => useFloatingDrag(vi.fn()))
    result.current.onPointerDown(pointer(100, 100, 2, 2))
    result.current.onPointerMove(pointer(110, 100, 2, 2))
    await act(async () => {})
    expect(invoke).not.toHaveBeenCalled()
  })
})
