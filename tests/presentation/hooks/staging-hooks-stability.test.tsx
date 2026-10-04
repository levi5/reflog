// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { RunAction } from "../../../src/presentation/hooks/repository/action-types"
import { useStagingBlame } from "../../../src/presentation/hooks/staging/useStagingBlame"
import { useStagingDiff } from "../../../src/presentation/hooks/staging/useStagingDiff"
import { useStagingIndexOps } from "../../../src/presentation/hooks/staging/useStagingIndexOps"
import { useStashOps } from "../../../src/presentation/hooks/staging/useStashOps"
import { useFileEditor } from "../../../src/presentation/hooks/staging/useFileEditor"
import { useStaging } from "../../../src/presentation/hooks/repository/useStaging"

const repo = "/tmp/repo"
const runAction = vi.fn() as unknown as RunAction

function unstableAfterRerender(hook: () => Record<string, unknown>): string[] {
  const { result, rerender } = renderHook(hook)
  const first = result.current
  rerender()
  const second = result.current
  return Object.keys(first).filter((key) => typeof first[key] === "function" && first[key] !== second[key])
}

describe("referencia estavel das acoes de staging", () => {
  it("useStagingIndexOps", () => {
    const deps = {
      lang: "en" as const,
      repo,
      runAction,
      requestConfirm: vi.fn(async () => true),
      loadDiff: vi.fn(async () => {}),
      reloadDiff: vi.fn(),
      clearDiffIfSelected: vi.fn(),
    }
    expect(unstableAfterRerender(() => useStagingIndexOps(deps) as unknown as Record<string, unknown>)).toEqual([])
  })

  it("useStashOps", () => {
    const deps = { lang: "en" as const, repo, runAction, gitApi: { stash: vi.fn(async () => []) } }
    expect(unstableAfterRerender(() => useStashOps(deps) as unknown as Record<string, unknown>)).toEqual([])
  })

  it("useStagingDiff", () => {
    const deps = { lang: "en" as const, repo, runAction, gitApi: { diff: vi.fn(async () => "") } }
    expect(unstableAfterRerender(() => useStagingDiff(deps) as unknown as Record<string, unknown>)).toEqual([])
  })

  it("useStagingBlame", () => {
    const deps = { lang: "en" as const, repo, runAction, gitApi: { blame: vi.fn(async () => ({})) } }
    expect(unstableAfterRerender(() => useStagingBlame(deps) as unknown as Record<string, unknown>)).toEqual([])
  })
})

describe("referencia estavel das acoes de staging e do commit box", () => {
  it("useFileEditor", () => {
    const deps = {
      lang: "en" as const,
      repo,
      runAction,
      requestConfirm: vi.fn(async () => true),
      setMsg: vi.fn(),
    }
    expect(unstableAfterRerender(() => useFileEditor(deps) as unknown as Record<string, unknown>)).toEqual([])
  })

  it("useStaging mantem estaveis doCommit, createBranch e as acoes de hunk", () => {
    const deps = {
      lang: "en" as const,
      repo,
      submodules: [],
      runAction,
      requestConfirm: vi.fn(async () => true),
      setMsg: vi.fn(),
    }
    const unstable = unstableAfterRerender(() => useStaging(deps) as unknown as Record<string, unknown>)
    expect(unstable).toEqual([])
  })
})
