import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const gitMock = { blame: vi.fn(), lsFiles: vi.fn() }

vi.mock("../../../src/infrastructure/git", () => ({ gitApi: gitMock }))

const { useStagingBlame } = await import("../../../src/presentation/hooks/staging/useStagingBlame")

const SHA = "a".repeat(40)
const BLAME_OUTPUT = [
  `${SHA} 1 1 1`,
  "author Dev",
  "author-time 1792000000",
  "summary primeira linha",
  "\tconst a = 1",
  "\tconst b = 2",
].join("\n")

beforeEach(() => {
  gitMock.blame.mockReset()
  gitMock.blame.mockResolvedValue(BLAME_OUTPUT)
})

describe("useStagingBlame", () => {
  it("keeps the previous lines while the next file loads", async () => {
    const { result } = renderHook(() => useStagingBlame({ repo: "/repo" }))

    await act(async () => {
      await result.current.loadBlame("a.ts")
    })
    const loadedLines = result.current.blameLines
    expect(loadedLines.length).toBeGreaterThan(0)

    gitMock.blame.mockImplementationOnce(() => new Promise(() => {}))
    await act(async () => {
      void result.current.loadBlame("b.ts")
    })

    expect(result.current.blameFile).toBe("b.ts")
    expect(result.current.blameLines).toEqual(loadedLines)
    expect(result.current.blameStale).toBe(true)
  })

  it("never blanks the lines on a file switch", async () => {
    const { result } = renderHook(() => useStagingBlame({ repo: "/repo" }))
    await act(async () => {
      await result.current.loadBlame("a.ts")
    })
    const snapshots: number[] = []
    for (const file of ["b.ts", "c.ts", "a.ts"]) {
      await act(async () => {
        await result.current.loadBlame(file)
      })
      snapshots.push(result.current.blameLines.length)
    }
    expect(snapshots.every((count) => count > 0)).toBe(true)
  })

  it("serves the second visit from the cache", async () => {
    const { result } = renderHook(() => useStagingBlame({ repo: "/repo" }))
    await act(async () => {
      await result.current.loadBlame("a.ts")
    })
    await act(async () => {
      await result.current.loadBlame("b.ts")
    })
    await act(async () => {
      await result.current.loadBlame("a.ts")
    })
    expect(gitMock.blame).toHaveBeenCalledTimes(2)
    expect(result.current.blameFile).toBe("a.ts")
  })

  it("does not flash the loading state on a cache hit", async () => {
    const { result } = renderHook(() => useStagingBlame({ repo: "/repo" }))
    await act(async () => {
      await result.current.loadBlame("a.ts")
    })
    await act(async () => {
      await result.current.loadBlame("b.ts")
    })
    await act(async () => {
      await result.current.loadBlame("a.ts")
    })
    expect(result.current.blameLoading).toBe(false)
    expect(result.current.blameStale).toBe(false)
  })

  it("drops a stale response when the user clicks again", async () => {
    let resolveFirst: ((value: string) => void) | null = null
    gitMock.blame.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve
        }),
    )
    const { result } = renderHook(() => useStagingBlame({ repo: "/repo" }))

    let firstLoad: Promise<void> = Promise.resolve()
    act(() => {
      firstLoad = result.current.loadBlame("slow.ts")
    })
    await act(async () => {
      await result.current.loadBlame("fast.ts")
    })
    expect(result.current.blameFile).toBe("fast.ts")

    await act(async () => {
      resolveFirst?.(BLAME_OUTPUT)
      await firstLoad
    })
    expect(result.current.blameFile).toBe("fast.ts")
  })

  it("reports the failure and drops the content", async () => {
    gitMock.blame.mockRejectedValueOnce(new Error("git blame failed"))
    const { result } = renderHook(() => useStagingBlame({ repo: "/repo" }))
    await act(async () => {
      await result.current.loadBlame("a.ts")
    })
    expect(result.current.blameError).not.toBeNull()
    expect(result.current.blameLines).toEqual([])
    expect(result.current.blameStale).toBe(false)
  })

  it("clears the cache on reset", async () => {
    const { result } = renderHook(() => useStagingBlame({ repo: "/repo" }))
    await act(async () => {
      await result.current.loadBlame("a.ts")
    })
    act(() => result.current.resetBlame())
    await act(async () => {
      await result.current.loadBlame("a.ts")
    })
    await waitFor(() => expect(gitMock.blame).toHaveBeenCalledTimes(2))
  })

  it("ignores an empty file or a missing repo", async () => {
    const { result } = renderHook(() => useStagingBlame({ repo: "" }))
    await act(async () => {
      await result.current.loadBlame("a.ts")
    })
    expect(gitMock.blame).not.toHaveBeenCalled()
  })
})
