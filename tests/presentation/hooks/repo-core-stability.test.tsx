// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { MessageProvider } from "../../../src/presentation/context"
import { useRepoCore } from "../../../src/presentation/hooks/repository/useRepoCore"
import type { IGitApi } from "../../../src/infrastructure/git/types"

function wrapper({ children }: { children: ReactNode }) {
  return <MessageProvider>{children}</MessageProvider>
}

const gitStub = {
  version: vi.fn(async () => "2.44.0"),
  status: vi.fn(async () => null),
  branches: vi.fn(async () => []),
  tags: vi.fn(async () => []),
  remotes: vi.fn(async () => []),
  submodules: vi.fn(async () => []),
  log: vi.fn(async () => []),
  count: vi.fn(async () => 0),
  diff: vi.fn(async () => ""),
  lsFiles: vi.fn(async () => []),
  config: vi.fn(async () => ({})),
} as unknown as IGitApi

describe("estabilidade da coreSlice", () => {
  it("useRepoCore mantem a referencia das acoes quando nenhum input muda", () => {
    const { result, rerender } = renderHook(() => useRepoCore("en", gitStub), { wrapper })
    const first = result.current as unknown as Record<string, unknown>
    rerender()
    const second = result.current as unknown as Record<string, unknown>

    const unstable = Object.keys(first).filter((key) => typeof first[key] === "function" && first[key] !== second[key])
    expect(unstable.join(" ")).toBe("")
  })

  it("useRepoCore mantem a referencia dos valores quando nenhum input muda", () => {
    const { result, rerender } = renderHook(() => useRepoCore("en", gitStub), { wrapper })
    const first = result.current as unknown as Record<string, unknown>
    rerender()
    const second = result.current as unknown as Record<string, unknown>

    const changed = Object.keys(first).filter((key) => typeof first[key] !== "function" && first[key] !== second[key])
    expect(changed).toEqual([])
  })
})
