import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FloatingModeControl } from "../../../src/presentation/components/Floating/ModeControl"
import { FloatingRuntime } from "../../../src/presentation/components/Floating/Runtime"

const state = vi.hoisted(() => ({
  desktop: true,
  repo: "/repo",
  invoke: vi.fn(),
  navigate: vi.fn(),
  handlers: new Map<string, (event: { payload: never }) => void>(),
}))
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => state.desktop,
  invoke: (...args: unknown[]) => state.invoke(...args),
}))
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((name: string, handler: (event: { payload: never }) => void) => {
    state.handlers.set(name, handler)
    return Promise.resolve(vi.fn())
  }),
}))
vi.mock("react-router-dom", () => ({ useNavigate: () => state.navigate }))
vi.mock("../../../src/presentation/context", () => ({
  useRepo: () => ({ repo: state.repo }),
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock("../../../src/presentation/components/Floating/useFloatingBridge", () => ({ useFloatingBridge: vi.fn() }))

describe("Floating mode settings and retained runtime", () => {
  beforeEach(() => {
    state.desktop = true
    state.repo = "/repo"
    state.handlers.clear()
    state.navigate.mockReset()
    state.invoke.mockReset().mockResolvedValue(false)
  })
  afterEach(cleanup)

  it("enables and disables the persistent mode using the settings switch", async () => {
    render(<FloatingModeControl />)
    const control = screen.getByRole("switch", { name: "floatingMode" }) as HTMLInputElement
    await waitFor(() => expect(control.disabled).toBe(false))
    fireEvent.click(control)
    await waitFor(() => expect(control.checked).toBe(true))
    expect(state.invoke).toHaveBeenCalledWith("set_floating_mode", { enabled: true })
    fireEvent.click(control)
    await waitFor(() => expect(control.checked).toBe(false))
    expect(state.invoke).toHaveBeenCalledWith("set_floating_mode", { enabled: false })
  })

  it("restores enabled state when Settings is reopened", async () => {
    state.invoke.mockResolvedValue(true)
    render(<FloatingModeControl />)
    await waitFor(() => expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true))
    expect(state.invoke).not.toHaveBeenCalledWith("set_floating_mode", expect.anything())
  })

  it("does not overwrite a mode-change event with an older startup query", async () => {
    let resolveInitial: (value: boolean) => void = () => {}
    state.invoke.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          resolveInitial = resolve
        }),
    )
    render(<FloatingModeControl />)
    await act(async () => state.handlers.get("floating-mode-changed")?.({ payload: true as never }))
    await act(async () => resolveInitial(false))
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true)
  })

  it("keeps the mode disabled and reports registration or persistence errors", async () => {
    render(<FloatingModeControl />)
    const control = screen.getByRole("switch") as HTMLInputElement
    await waitFor(() => expect(control.disabled).toBe(false))
    state.invoke.mockRejectedValueOnce(new Error("Could not save preferences"))
    fireEvent.click(control)
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Could not save preferences"))
    expect(control.checked).toBe(false)
  })

  it.each([
    ["merge", "/merge"],
    ["commit", "/staging"],
    ["settings", "/settings"],
    ["graph", "/graph"],
    ["compare", "/compare"],
  ])("routes %s without mounting the Settings screen", async (payload, path) => {
    render(<FloatingRuntime />)
    await act(async () => state.handlers.get("floating-action")?.({ payload: payload as never }))
    expect(state.navigate).toHaveBeenCalledWith(path)
  })

  it("keeps the current screen when opening the panel", () => {
    render(<FloatingRuntime />)
    state.handlers.get("floating-action")?.({ payload: "panel" as never })
    expect(state.navigate).not.toHaveBeenCalled()
  })

  it("opens welcome when there is no repository", () => {
    state.repo = ""
    render(<FloatingRuntime />)
    state.handlers.get("floating-action")?.({ payload: "commit" as never })
    expect(state.navigate).toHaveBeenCalledWith("/")
  })

  it("disables the desktop-only setting in the browser", () => {
    state.desktop = false
    render(<FloatingModeControl />)
    expect((screen.getByRole("switch") as HTMLInputElement).disabled).toBe(true)
    expect(state.invoke).not.toHaveBeenCalled()
  })
})
