import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DiffPanel } from "../../../src/presentation/components/Diff/Panel"
import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"

const PATCH = [
  "diff --git a/a.ts b/a.ts",
  "--- a/a.ts",
  "+++ b/a.ts",
  "@@ -10,7 +10,7 @@ export function exemplo() {",
  "   contexto antes",
  "-  const removido = await alvo.antigo()",
  "+  const removido = await alvo.novo()",
].join("\n")

type PanelProps = Parameters<typeof DiffPanel>[0]

function renderPanel(props: Partial<PanelProps> = {}) {
  const base = {
    filePath: "a.ts",
    isStaged: false,
    diffContent: PATCH,
    loaded: true,
    loading: false,
    errorMessage: null,
    onLoad: vi.fn(),
    onStageHunk: vi.fn(),
    onUnstageHunk: vi.fn(),
    onDiscardHunk: vi.fn(),
    onStageSelected: vi.fn(),
    onUnstageSelected: vi.fn(),
  }
  return {
    ...render(
      <TranslationProvider>
        <DiffPanel {...{ ...base, ...props }} />
      </TranslationProvider>,
    ),
    props: { ...base, ...props },
  }
}

const busyBar = () => document.querySelector('[role="progressbar"]')
const hunks = () => document.querySelectorAll('[class*="hunkBlock"]')

describe("DiffPanel", () => {
  it("renders the hunks without asking the user to load anything", () => {
    renderPanel()
    expect(hunks().length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: /load diff/i })).toBeNull()
  })

  it("keeps the previous patch visible while the next one loads", () => {
    renderPanel({ loading: true, stale: true })
    expect(hunks().length).toBeGreaterThan(0)
    expect(busyBar()?.getAttribute("aria-busy")).toBe("true")
    expect(document.querySelector("[aria-busy]")).not.toBeNull()
  })

  it("shows the progress bar while loading a file that was never loaded", () => {
    renderPanel({ loaded: false, loading: true })
    expect(busyBar()?.getAttribute("aria-busy")).toBe("true")
    expect(screen.getByRole("status")).not.toBeNull()
  })

  it("leaves the progress bar idle when nothing is loading", () => {
    renderPanel()
    expect(busyBar()?.getAttribute("aria-busy")).toBe("false")
  })

  it("shows the retry button when the diff failed", () => {
    const { props } = renderPanel({ loaded: false, errorMessage: "git diff failed" })
    expect(screen.getByRole("alert").textContent).toBe("git diff failed")
    expect(screen.getByRole("button", { name: /load diff/i })).not.toBeNull()
    expect(props.onLoad).toBeDefined()
  })

  it("asks for a file before anything else", () => {
    renderPanel({ filePath: "" })
    expect(hunks().length).toBe(0)
    expect(busyBar()).toBeNull()
  })

  it("retries the diff from the retry button", async () => {
    const { props } = renderPanel({ loaded: false, errorMessage: "git diff failed" })
    await userEvent.click(screen.getByRole("button", { name: /load diff/i }))
    expect(props.onLoad).toHaveBeenCalledOnce()
  })

  it("still lists the hunks for a staged file", () => {
    renderPanel({ isStaged: true })
    expect(hunks().length).toBeGreaterThan(0)
  })

  it("does not remount when only the load flag changes", async () => {
    const { rerender } = renderPanel()
    const before = hunks()[0]
    rerender(
      <TranslationProvider>
        <DiffPanel
          filePath="a.ts"
          isStaged={false}
          diffContent={PATCH}
          loaded
          loading
          stale
          errorMessage={null}
          onLoad={vi.fn()}
          onStageHunk={vi.fn()}
          onUnstageHunk={vi.fn()}
          onDiscardHunk={vi.fn()}
          onStageSelected={vi.fn()}
          onUnstageSelected={vi.fn()}
        />
      </TranslationProvider>,
    )
    expect(hunks()[0]).toBe(before)
  })

  it("stages a hunk on click", async () => {
    const onStageHunk = vi.fn()
    renderPanel({ onStageHunk })
    await userEvent.click(screen.getByRole("button", { name: /stage hunk/i }))
    expect(onStageHunk).toHaveBeenCalledOnce()
    expect(String(onStageHunk.mock.calls[0]?.[0])).toContain("@@")
  })
})
