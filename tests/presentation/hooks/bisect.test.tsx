import { renderToString } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useBisect } from "../../../src/presentation/hooks/repository/useBisect"
import type { IGitApi } from "../../../src/infrastructure/git/types"
import type { RunAction } from "../../../src/presentation/hooks/repository/action-types"

const git = {
  bisectStart: vi.fn(),
  bisectGood: vi.fn(),
  bisectBad: vi.fn(),
  bisectSkip: vi.fn(),
  bisectReset: vi.fn(),
  bisectLog: vi.fn(),
} as unknown as IGitApi

function renderBisect() {
  const runAction = vi.fn<RunAction>(async (work, after) => {
    await work()
    after?.()
  })
  let bisect!: ReturnType<typeof useBisect>
  function Harness() {
    bisect = useBisect({ lang: "en", repo: "/repo", runAction, git })
    return null
  }
  renderToString(<Harness />)
  return { bisect, runAction }
}

describe("useBisect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(git.bisectStart).mockResolvedValue("started")
    vi.mocked(git.bisectGood).mockResolvedValue("good")
    vi.mocked(git.bisectBad).mockResolvedValue("bad")
    vi.mocked(git.bisectSkip).mockResolvedValue("skipped")
    vi.mocked(git.bisectReset).mockResolvedValue("reset")
    vi.mocked(git.bisectLog).mockResolvedValue("git bisect start")
  })

  it("starts with trimmed revisions", async () => {
    const { bisect } = renderBisect()
    await bisect.start(" HEAD ", " v1.0 ")
    expect(git.bisectStart).toHaveBeenCalledWith("/repo", "HEAD", "v1.0")
  })

  it("does not start without both revisions", async () => {
    const { bisect, runAction } = renderBisect()
    await bisect.start("HEAD", " ")
    expect(runAction).not.toHaveBeenCalled()
    expect(git.bisectStart).not.toHaveBeenCalled()
  })

  it("marks, skips, resets and loads the log", async () => {
    const { bisect } = renderBisect()
    await bisect.mark("good")
    await bisect.mark("bad", "abc123")
    await bisect.skip()
    await bisect.reset()
    await bisect.loadLog()
    expect(git.bisectGood).toHaveBeenCalledWith("/repo", undefined)
    expect(git.bisectBad).toHaveBeenCalledWith("/repo", "abc123")
    expect(git.bisectSkip).toHaveBeenCalledWith("/repo")
    expect(git.bisectReset).toHaveBeenCalledWith("/repo")
    expect(git.bisectLog).toHaveBeenCalledWith("/repo")
  })
})
