import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"
import { SubmodulePanel } from "../../../src/presentation/components/Branch/Submodule"
import {
  hasOutdated,
  isKnownSubmoduleState,
  isOutdated,
  submodulesChanged,
} from "../../../src/presentation/components/Branch/Submodule/state"
import type { SubmoduleInfo } from "../../../src/types"

const submodule = (path: string, state = " ", hash = "b".repeat(40), behind = 0): SubmoduleInfo => ({
  name: path,
  path,
  url: "",
  branch: "",
  hash,
  state,
  ahead: 0,
  behind,
})

function renderPanel(node: React.ReactNode) {
  return render(<TranslationProvider>{node}</TranslationProvider>)
}

describe("SubmodulePanel", () => {
  it("renders every state as an icon with a tooltip and no state text", () => {
    renderPanel(
      <SubmodulePanel
        submodules={[
          submodule("libs/api"),
          submodule("libs/ui", "+"),
          submodule("libs/db", "-"),
          submodule("libs/x", "U"),
        ]}
        onUpdate={vi.fn()}
      />,
    )

    const states = screen.getAllByRole("img")
    expect(states.map((node) => node.getAttribute("aria-label"))).toEqual([
      "ok",
      "diverged",
      "uninitialized",
      "conflict",
    ])

    for (const state of states) {
      expect(state.textContent).toBe("")
      expect(state.getAttribute("title")).toBe(state.getAttribute("aria-label"))
    }

    const icons = states.map((node) => node.querySelector("svg")?.getAttribute("class"))
    expect(new Set(icons).size).toBe(4)
  })

  it("falls back to the raw flag when the state is unknown", () => {
    renderPanel(<SubmodulePanel submodules={[submodule("libs/api", "?")]} onUpdate={vi.fn()} />)

    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("?")
  })

  it("paints the update icon amber only when the submodule is behind its upstream", () => {
    const { rerender } = renderPanel(
      <SubmodulePanel submodules={[submodule("libs/api", "+", "aaa111", 0)]} onUpdate={vi.fn()} />,
    )

    const button = () => screen.getAllByRole("button", { name: /update submodules libs\/api/i })[0]
    expect(button().querySelector("svg")?.getAttribute("class")).not.toContain("targetOutdated")

    rerender(
      <TranslationProvider>
        <SubmodulePanel submodules={[submodule("libs/api", "+", "aaa111", 2)]} onUpdate={vi.fn()} />
      </TranslationProvider>,
    )

    expect(button().querySelector("svg")?.getAttribute("class")).toContain("targetOutdated")
  })

  it("confirms the update with a check once a submodule hash changes", async () => {
    const before = submodule("libs/api", "+", "aaa111")
    const after = submodule("libs/api", " ", "bbb222")

    function Harness() {
      const [modules, setModules] = useState<SubmoduleInfo[]>([before])
      return <SubmodulePanel submodules={modules} onUpdate={() => setModules([after])} onOpen={vi.fn()} />
    }

    renderPanel(<Harness />)

    const update = screen.getAllByRole("button", { name: /update submodules libs\/api/i })[0]
    expect(update.querySelector("svg")?.getAttribute("class")).not.toContain("updatedIcon")

    await userEvent.click(update)

    expect(update.querySelector("svg")?.getAttribute("class")).toContain("updatedIcon")
  })

  it("keeps the refresh icon when the update changes nothing", async () => {
    const same = submodule("libs/api", " ", "aaa111")
    const onUpdate = vi.fn()

    renderPanel(<SubmodulePanel submodules={[same]} onUpdate={onUpdate} />)

    const update = screen.getAllByRole("button", { name: /update submodules/i })[1]
    await userEvent.click(update)

    expect(onUpdate).toHaveBeenCalledWith("libs/api")
    expect(update.querySelector("svg")?.getAttribute("class")).not.toContain("updatedIcon")
  })
})

describe("submodule state helpers", () => {
  it("knows the four git flags", () => {
    expect(isKnownSubmoduleState(" ")).toBe(true)
    expect(isKnownSubmoduleState("+")).toBe(true)
    expect(isKnownSubmoduleState("-")).toBe(true)
    expect(isKnownSubmoduleState("U")).toBe(true)
    expect(isKnownSubmoduleState("?")).toBe(false)
  })

  it("marks only submodules with commits pending on the upstream", () => {
    expect(hasOutdated([submodule("a"), submodule("b")])).toBe(false)
    expect(hasOutdated([submodule("a", " ", "b".repeat(40), 2), submodule("b")])).toBe(true)
    expect(hasOutdated([submodule("a", "+")])).toBe(false)
    expect(hasOutdated([submodule("a", "-")])).toBe(false)
    expect(hasOutdated([submodule("a", "U")])).toBe(false)
  })

  it("does not mark a submodule that is ahead of its upstream", () => {
    expect(isOutdated(submodule("a", "+"))).toBe(false)
    expect(isOutdated(submodule("a", " ", "b".repeat(40), 1))).toBe(true)
  })

  it("detects hash, state and length changes", () => {
    const base = [submodule("a", " ", "aaa111"), submodule("b", " ", "bbb222")]

    expect(submodulesChanged(base, [submodule("a", " ", "aaa111"), submodule("b", " ", "bbb222")])).toBe(false)
    expect(submodulesChanged(base, [submodule("a", " ", "ccc333"), submodule("b", " ", "bbb222")])).toBe(true)
    expect(submodulesChanged(base, [submodule("a", "+", "aaa111"), submodule("b", " ", "bbb222")])).toBe(true)
    expect(submodulesChanged(base, [submodule("a", " ", "aaa111", 1), submodule("b", " ", "bbb222")])).toBe(true)
    expect(submodulesChanged(base, [submodule("a", " ", "aaa111")])).toBe(true)
    expect(submodulesChanged(base, [submodule("a", " ", "aaa111"), submodule("c", " ", "bbb222")])).toBe(true)
  })
})
