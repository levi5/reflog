import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const gitMock = { blame: vi.fn() }
vi.mock("../../../src/infrastructure/git", () => ({ gitApi: gitMock }))

const repoStub = vi.hoisted(() => ({ current: null as unknown }))

vi.mock("../../../src/presentation/context", async () => {
  const actual = await vi.importActual<typeof import("../../../src/presentation/context")>(
    "../../../src/presentation/context",
  )
  return {
    ...actual,
    useRepo: () => repoStub.current,
    useSearch: () => ({ query: "", scope: "files" }),
    useSettingsContext: () => ({ lang: "en" }),
  }
})

const { Blame } = await import("../../../src/presentation/pages/Blame")
const { useStagingBlame } = await import("../../../src/presentation/hooks/staging/useStagingBlame")
const { TranslationProvider } = await import("../../../src/presentation/context/translation/translation-context")

const SHA = "b".repeat(40)
const blameOutput = (lines: string[]) =>
  [`${SHA} 1 1 1`, "author Dev", "author-time 1792000000", "summary initial", ...lines.map((line) => `\t${line}`)].join(
    "\n",
  )

const TRACKED = ["a.ts", "b.ts", "c.ts", "d.ts"]

function Harness() {
  const blame = useStagingBlame({ repo: "/repo" })
  const repo = {
    repo: "/repo",
    trackedFiles: TRACKED,
    loadTracked: vi.fn(),
    openEditor: vi.fn(),
    editingFile: null,
    editContent: "",
    editDraft: "",
    busy: false,
    setEditDraft: vi.fn(),
    saveEditor: vi.fn(),
    closeEditor: vi.fn(),
    cherryPick: vi.fn(),
    revert: vi.fn(),
    resetBranch: vi.fn(),
    checkoutBranch: vi.fn(),
    loadCommitFiles: vi.fn(),
    loadCommitDiff: vi.fn(),
    ...blame,
  }
  repoStub.current = repo
  return <Blame />
}

function renderBlame() {
  return render(
    <MemoryRouter initialEntries={["/blame"]}>
      <TranslationProvider>
        <Harness />
      </TranslationProvider>
    </MemoryRouter>,
  )
}

const skeleton = () => screen.queryAllByRole("status")
const busyBar = () => document.querySelector('[role="progressbar"]')
const panel = () => document.querySelector("section[aria-label]")
const rows = () => document.querySelectorAll("section[aria-label] > div > div > div")
const pick = (file: string) => screen.getAllByText(file)[0]
const defer = () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  gitMock.blame.mockReset()
  gitMock.blame.mockResolvedValue(blameOutput(["const a = 1", "const b = 2"]))
})

describe("Blame flicker", () => {
  it("shows the skeleton only for the very first load", async () => {
    const first = defer()
    gitMock.blame.mockImplementationOnce(() => first.promise)
    renderBlame()

    await userEvent.click(pick("b.ts"))
    expect(skeleton()).toHaveLength(1)
    expect(busyBar()?.getAttribute("aria-busy")).toBe("true")

    await act(async () => {
      first.resolve(blameOutput(["const a = 1"]))
      await first.promise
    })
    await waitFor(() => expect(skeleton()).toHaveLength(0))
    expect(panel()?.textContent).toContain("const a = 1")
  })

  it("keeps the old lines visible through four fast switches", async () => {
    renderBlame()
    await userEvent.click(pick("a.ts"))
    await waitFor(() => expect(rows()).toHaveLength(2))

    gitMock.blame.mockImplementation(() => new Promise(() => {}))
    for (const file of ["c.ts", "d.ts"]) {
      await userEvent.click(pick(file))
      expect(skeleton()).toHaveLength(0)
      expect(rows()).toHaveLength(2)
      expect(busyBar()?.getAttribute("aria-busy")).toBe("true")
      expect(panel()?.getAttribute("aria-busy")).toBe("true")
    }

    for (const file of ["a.ts", "a.ts"]) {
      await userEvent.click(pick(file))
      expect(skeleton()).toHaveLength(0)
      expect(rows()).toHaveLength(2)
      expect(busyBar()?.getAttribute("aria-busy")).toBe("false")
    }
  })

  it("never shows the skeleton again once a file was loaded", async () => {
    renderBlame()
    for (const file of ["a.ts", "b.ts", "c.ts", "d.ts"]) {
      await userEvent.click(pick(file))
      await waitFor(() => expect(rows()).toHaveLength(2))
      expect(skeleton()).toHaveLength(0)
    }
  })

  it("does not reload the file when it is re-selected", async () => {
    renderBlame()
    await userEvent.click(pick("a.ts"))
    await waitFor(() => expect(gitMock.blame).toHaveBeenCalledTimes(1))
    await userEvent.click(pick("a.ts"))
    expect(gitMock.blame).toHaveBeenCalledTimes(1)
  })

  it("swaps the content for the cache hit without a loading pass", async () => {
    renderBlame()
    await userEvent.click(pick("a.ts"))
    await waitFor(() => expect(rows()).toHaveLength(2))
    await userEvent.click(pick("b.ts"))
    await waitFor(() => expect(panel()?.textContent).toContain("const b = 2"))
    await userEvent.click(pick("a.ts"))
    await waitFor(() => expect(panel()?.textContent).toContain("const a = 1"))
    expect(gitMock.blame).toHaveBeenCalledTimes(2)
    expect(busyBar()?.getAttribute("aria-busy")).toBe("false")
  })
})
