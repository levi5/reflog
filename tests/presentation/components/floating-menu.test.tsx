import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FloatingMenu } from "../../../src/presentation/components/Floating"
import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"

const { invoke, startDragging, handlers } = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  startDragging: vi.fn().mockResolvedValue(undefined),
  handlers: new Map<string, () => void>(),
}))

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true, invoke }))
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => ({ startDragging }) }))
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((name: string, handler: () => void) => {
    handlers.set(name, handler)
    return Promise.resolve(() => handlers.delete(name))
  }),
}))
vi.mock("../../../src/presentation/components/Floating/bridge", () => ({
  requestFloating: vi.fn().mockResolvedValue({ repoPath: "", status: null, branches: [], stashes: [], busy: false }),
}))

function mount() {
  return render(
    <TranslationProvider>
      <FloatingMenu />
    </TranslationProvider>,
  )
}

async function open() {
  fireEvent.mouseEnter(screen.getByRole("button", { name: /Floating mode|Modo flutuante/ }))
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("resize_floating", { expanded: true }))
  await waitFor(() => expect(screen.getByRole("navigation").hasAttribute("inert")).toBe(false))
}

describe("Floating radial menu", () => {
  beforeEach(() => {
    invoke.mockClear()
    startDragging.mockClear()
    handlers.clear()
  })
  afterEach(cleanup)

  it("starts collapsed and expands on hover", async () => {
    mount()
    expect(screen.getByRole("navigation").hasAttribute("inert")).toBe(true)
    await open()
    expect(screen.getByRole("button", { name: "Merge" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Commit" })).toBeTruthy()
  })

  it("shows only icons while retaining tooltips and accessible action names", async () => {
    mount()
    await open()
    const commit = screen.getByRole("button", { name: "Commit" })
    expect(commit.textContent).toBe("")
    expect(commit.getAttribute("title")).toBe("Commit")
    expect(screen.getByRole("button", { name: /Floating mode|Modo flutuante/ }).textContent).toBe("")
  })

  it.each(["Merge", "Commit"])("opens %s without performing a Git operation", async (label) => {
    mount()
    await open()
    fireEvent.click(screen.getByRole("button", { name: label }))
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("resize_floating", {
        expanded: true,
        panel: true,
        workspace: label.toLowerCase(),
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Back to floating button|Voltar ao botão/ })).toBeTruthy(),
    )
    expect(invoke.mock.calls.every(([command]) => command === "resize_floating")).toBe(true)
  })

  it("collapses with Escape and hides on a second Escape", async () => {
    mount()
    await open()
    fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" })
    await waitFor(() => expect(screen.getByRole("navigation").hasAttribute("inert")).toBe(true))
    fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" })
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("floating_action", { action: "hide" }))
  })

  it("collapses after the global shortcut hides it", async () => {
    mount()
    await open()
    await act(async () => {
      handlers.get("floating-hidden")?.()
    })
    expect(screen.getByRole("navigation").hasAttribute("inert")).toBe(true)
  })

  it("reports native failures", async () => {
    mount()
    await open()
    invoke.mockRejectedValueOnce(new Error("Resize failed"))
    fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" })
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Resize failed"))
  })

  it("allows retrying expansion after two queued native failures", async () => {
    mount()
    let rejectFirst: (error: Error) => void = () => {}
    invoke.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectFirst = reject
        }),
    )
    invoke.mockRejectedValueOnce(new Error("Collapse failed"))
    fireEvent.mouseEnter(screen.getByRole("button", { name: /Floating mode|Modo flutuante/ }))
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1))
    await act(async () => handlers.get("floating-hidden")?.())
    await act(async () => rejectFirst(new Error("Expand failed")))
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Collapse failed"))
    invoke.mockClear()
    await open()
  })

  it("opens the standard application rather than a compact workspace from Open panel", async () => {
    mount()
    await open()
    fireEvent.click(screen.getByRole("button", { name: /Open panel|Abrir painel/ }))
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("floating_action", { action: "panel" }))
    expect(invoke).not.toHaveBeenCalledWith("resize_floating", { expanded: true, panel: true })
  })

  it("offers nested actions and a central Back control", async () => {
    mount()
    await open()
    fireEvent.click(screen.getByRole("button", { name: /More actions|Mais opções/ }))
    expect(screen.getByRole("button", { name: "Stash" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /History|Histórico/ })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Compare|Comparar/ })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /^(Back|Voltar)$/ }))
    expect(screen.getByRole("button", { name: "Commit" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Stash" })).toBeNull()
  })

  it("opens History in the full application from the submenu", async () => {
    mount()
    await open()
    fireEvent.click(screen.getByRole("button", { name: /More actions|Mais opções/ }))
    fireEvent.click(screen.getByRole("button", { name: /History|Histórico/ }))
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("floating_action", { action: "graph" }))
  })

  it("collapses on leaving the actual native circle, not its square transparent surface", async () => {
    mount()
    await open()
    await act(async () => {
      handlers.get("floating-pointer-outside")?.()
    })
    expect(screen.getByRole("navigation").hasAttribute("inert")).toBe(true)
  })
})
