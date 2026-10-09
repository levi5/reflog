import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const gitMock = { diff: vi.fn() }

vi.mock("../../../src/infrastructure/git", () => ({ gitApi: gitMock }))

const { useStagingDiff } = await import("../../../src/presentation/hooks/staging/useStagingDiff")

const PATCH_A = "diff --git a/a.ts b/a.ts\n@@ -1 +1 @@\n-old\n+new"
const PATCH_B = "diff --git a/b.ts b/b.ts\n@@ -2 +2 @@\n-antigo\n+novo"

beforeEach(() => {
  gitMock.diff.mockReset()
  gitMock.diff.mockImplementation(async (_repo: string, file: string) => (file === "a.ts" ? PATCH_A : PATCH_B))
})

function setup() {
  return renderHook(() => useStagingDiff({ lang: "en", repo: "/repo" }))
}

describe("useStagingDiff", () => {
  it("loads the diff as soon as a file is selected", async () => {
    const { result } = setup()
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(result.current.diffLoaded).toBe(true))
    expect(gitMock.diff).toHaveBeenCalledWith("/repo", "a.ts", false)
    expect(result.current.diff).toBe(PATCH_A)
  })

  it("keeps the previous diff while the next file loads", async () => {
    const { result } = setup()
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(result.current.diffLoaded).toBe(true))

    gitMock.diff.mockImplementationOnce(() => new Promise(() => {}))
    act(() => result.current.selectDiff("b.ts", false))
    await waitFor(() => expect(result.current.diffStale).toBe(true))
    expect(result.current.diff).toBe(PATCH_A)
    expect(result.current.diffLoading).toBe(true)
  })

  it("serves a repeated selection from the cache", async () => {
    const { result } = setup()
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(result.current.diffLoaded).toBe(true))
    act(() => result.current.selectDiff("b.ts", false))
    await waitFor(() => expect(result.current.diff).toBe(PATCH_B))
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(result.current.diff).toBe(PATCH_A))
    expect(gitMock.diff).toHaveBeenCalledTimes(2)
    expect(result.current.diffStale).toBe(false)
  })

  it("never mixes the staged and unstaged caches", async () => {
    const { result } = setup()
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(result.current.diffLoaded).toBe(true))
    act(() => result.current.selectDiff("a.ts", true))
    await waitFor(() => expect(gitMock.diff).toHaveBeenCalledTimes(2))
    expect(gitMock.diff).toHaveBeenLastCalledWith("/repo", "a.ts", true)
  })

  it("drops a stale response when the user clicks again", async () => {
    let resolveFirst: ((value: string) => void) | null = null
    gitMock.diff.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve
        }),
    )
    const { result } = setup()
    let firstLoad: Promise<void> = Promise.resolve()
    act(() => {
      firstLoad = result.current.loadDiff("slow.ts", false)
    })
    act(() => result.current.selectDiff("fast.ts", false))
    await waitFor(() => expect(result.current.diff).toBe(PATCH_B))

    await act(async () => {
      resolveFirst?.(PATCH_A)
      await firstLoad
    })
    expect(result.current.selectedFile).toBe("fast.ts")
    expect(result.current.diff).toBe(PATCH_B)
  })

  it("reloads from git on demand and bypasses the cache", async () => {
    const { result } = setup()
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(result.current.diffLoaded).toBe(true))
    act(() => result.current.reloadDiff())
    await waitFor(() => expect(gitMock.diff).toHaveBeenCalledTimes(2))
  })

  it("clears the panel when the selection is dropped", async () => {
    const { result } = setup()
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(result.current.diffLoaded).toBe(true))
    act(() => result.current.selectDiff("", false))
    await waitFor(() => expect(result.current.diff).toBe(""))
    expect(result.current.diffLoaded).toBe(false)
    expect(result.current.diffStale).toBe(false)
  })

  it("clears everything when the selected file leaves the status", async () => {
    const { result } = setup()
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(result.current.diffLoaded).toBe(true))
    act(() => result.current.clearDiffIfSelected("b.ts"))
    expect(result.current.diff).toBe(PATCH_A)
    act(() => result.current.clearDiffIfSelected("a.ts"))
    expect(result.current.diff).toBe("")
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(result.current.diff).toBe(PATCH_A))
    expect(gitMock.diff).toHaveBeenCalledTimes(2)
  })

  it("reports the failure and empties the panel", async () => {
    gitMock.diff.mockRejectedValueOnce(new Error("git diff failed"))
    const { result } = setup()
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(result.current.diffError).not.toBeNull())
    expect(result.current.diffLoaded).toBe(false)
    expect(result.current.diff).toBe("")
  })

  it("does not load without a repo or a file", async () => {
    const { result } = renderHook(() => useStagingDiff({ lang: "en", repo: "" }))
    act(() => result.current.selectDiff("a.ts", false))
    await waitFor(() => expect(gitMock.diff).not.toHaveBeenCalled())
  })
})
