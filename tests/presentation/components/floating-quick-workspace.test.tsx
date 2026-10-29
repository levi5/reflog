import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { FloatingQuickWorkspace } from "../../../src/presentation/components/Floating/QuickWorkspace"

const { invoke, handlers } = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  handlers: new Map<string, (event: { payload: string }) => void>(),
}))
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true, invoke }))
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((name: string, handler: (event: { payload: string }) => void) => {
    handlers.set(name, handler)
    return Promise.resolve(() => handlers.delete(name))
  }),
}))
vi.mock("../../../src/presentation/components/Floating/useFloatingViewport", () => ({ useFloatingViewport: vi.fn() }))
vi.mock("../../../src/presentation/components/Floating/Workspace", () => ({
  FloatingWorkspace: ({ view, initialFilter, onBack }: { view: string; initialFilter: string; onBack: () => void }) => (
    <button type="button" onClick={onBack}>
      {view}:{initialFilter}
    </button>
  ),
}))

beforeEach(() => {
  invoke.mockClear()
  handlers.clear()
})
afterEach(cleanup)

it("switches workspaces and closes only the panel, without moving or resizing the button", async () => {
  render(
    <MemoryRouter initialEntries={["/floating-workspace/commit"]}>
      <Routes>
        <Route path="/floating-workspace/:kind" element={<FloatingQuickWorkspace />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByRole("button", { name: "commit:all" })).toBeTruthy()
  await act(async () => handlers.get("floating-workspace-changed")?.({ payload: "merge" }))
  expect(screen.getByRole("button", { name: "merge:all" })).toBeTruthy()
  await act(async () => handlers.get("floating-workspace-changed")?.({ payload: "stash" }))
  fireEvent.click(screen.getByRole("button", { name: "commit:stash" }))
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("close_floating_workspace"))
  expect(invoke).toHaveBeenCalledTimes(1)
})
