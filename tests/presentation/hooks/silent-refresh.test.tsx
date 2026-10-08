import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useRepositoryData } from "../../../src/presentation/hooks/repository/useRepositoryData"
import type { IGitApi } from "../../../src/infrastructure/git/types"
import type { StatusResult } from "../../../src/types"

const status = (head: string): StatusResult => ({
  root: "/repo",
  branch: "main",
  head,
  ahead: 0,
  behind: 0,
  files: [],
  merging: false,
  cherryPicking: false,
  reverting: false,
  rebasing: false,
})

function makeGit(heads: string[]) {
  let calls = 0
  const counters = { status: 0, branches: 0, conflicted: 0, tagList: 0, remoteList: 0, submodules: 0 }
  const git = {
    status: vi.fn(async () => {
      counters.status += 1
      calls += 1
      return status(heads[Math.min(calls - 1, heads.length - 1)])
    }),
    branches: vi.fn(async () => {
      counters.branches += 1
      return []
    }),
    conflicted: vi.fn(async () => {
      counters.conflicted += 1
      return []
    }),
    tagList: vi.fn(async () => {
      counters.tagList += 1
      return []
    }),
    remoteList: vi.fn(async () => {
      counters.remoteList += 1
      return []
    }),
    submodules: vi.fn(async () => {
      counters.submodules += 1
      return []
    }),
    version: vi.fn(async () => "2.44.0"),
    remoteUrl: vi.fn(async () => ""),
    gpg: vi.fn(async () => ""),
    count: vi.fn(async () => 0),
  } as unknown as IGitApi
  return { git, counters }
}

describe("silent refresh cheap-path", () => {
  const setBusy = vi.fn()
  const setMsg = vi.fn()

  it("skips the remaining calls when the status is unchanged", async () => {
    const { git, counters } = makeGit(["aaa", "aaa"])
    const { result } = renderHook(() => useRepositoryData({ repo: "", git, setBusy, setMsg }))
    await result.current.refresh("/repo", "silent")
    expect(counters.status).toBe(1)
    expect(counters.branches).toBe(1)
    await result.current.refresh("/repo", "silent")
    expect(counters.status).toBe(2)
    expect(counters.branches).toBe(1)
    expect(counters.tagList).toBe(1)
    expect(counters.remoteList).toBe(1)
  })

  it("fetches the rest when the status changes", async () => {
    const { git, counters } = makeGit(["aaa", "bbb"])
    const { result } = renderHook(() => useRepositoryData({ repo: "", git, setBusy, setMsg }))
    await act(async () => {
      await result.current.refresh("/repo", "silent")
    })
    await act(async () => {
      await result.current.refresh("/repo", "silent")
    })
    expect(counters.status).toBe(2)
    expect(counters.branches).toBe(2)
    expect(result.current.status?.head).toBe("bbb")
  })

  it("never shows an error in silent mode", async () => {
    const git = {
      status: vi.fn(async () => {
        throw new Error("ipc gone")
      }),
    } as unknown as IGitApi
    const localMsg = vi.fn()
    const { result } = renderHook(() => useRepositoryData({ repo: "", git, setBusy, setMsg: localMsg }))
    await result.current.refresh("/repo", "silent")
    expect(localMsg).not.toHaveBeenCalled()
  })
})
