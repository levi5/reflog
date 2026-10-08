import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { useCommitDiff } from "../../../src/presentation/components/Commit/Detail/useCommitDiff"
import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"
import type { CommitFileChange } from "../../../src/types"

const FILES: CommitFileChange[] = [{ status: "M", path: "src/app.ts" }]

function wrapper({ children }: { children: React.ReactNode }) {
  return <TranslationProvider>{children}</TranslationProvider>
}

describe("useCommitDiff", () => {
  it("loads the commit files", async () => {
    const loadFiles = vi.fn().mockResolvedValue(FILES)
    const { result } = renderHook(() => useCommitDiff({ hash: "abc", loadFiles }), { wrapper })

    await waitFor(() => expect(result.current.files).toEqual(FILES))
    expect(result.current.loadingFiles).toBe(false)
    expect(loadFiles).toHaveBeenCalledWith("abc")
  })

  it("empties the file list when the loader fails", async () => {
    const loadFiles = vi.fn().mockRejectedValue(new Error("boom"))
    const { result } = renderHook(() => useCommitDiff({ hash: "abc", loadFiles }), { wrapper })

    await waitFor(() => expect(result.current.loadingFiles).toBe(false))
    expect(result.current.files).toEqual([])
  })

  it("loads the diff of the selected file and reuses the cache", async () => {
    const loadDiff = vi.fn().mockResolvedValue("diff")
    const { result } = renderHook(() => useCommitDiff({ hash: "abc", loadDiff }), { wrapper })

    await act(async () => result.current.selectFile("src/app.ts"))
    expect(result.current.diffText).toBe("diff")
    expect(loadDiff).toHaveBeenCalledTimes(1)

    await act(async () => result.current.selectFile("src/other.ts"))
    await act(async () => result.current.selectFile("src/app.ts"))
    expect(result.current.diffText).toBe("diff")
    expect(loadDiff).toHaveBeenCalledTimes(2)
  })

  it("clears the selection when the same file is picked again", async () => {
    const loadDiff = vi.fn().mockResolvedValue("diff")
    const { result } = renderHook(() => useCommitDiff({ hash: "abc", loadDiff }), { wrapper })

    await act(async () => result.current.selectFile("src/app.ts"))
    await act(async () => result.current.selectFile("src/app.ts"))
    expect(result.current.selectedFile).toBe("")
    expect(result.current.diffText).toBe("")
  })

  it("translates the size-limit failure", async () => {
    const loadDiff = vi.fn().mockRejectedValue(new Error("diff excede o limite"))
    const { result } = renderHook(() => useCommitDiff({ hash: "abc", loadDiff }), { wrapper })

    await act(async () => result.current.selectFile("src/app.ts"))
    await waitFor(() => expect(result.current.diffError).not.toBe(""))
    expect(result.current.diffError).toMatch(/limit/i)
  })

  it("resets when the commit changes", async () => {
    const loadDiff = vi.fn().mockResolvedValue("diff")
    const { result, rerender } = renderHook(({ hash }) => useCommitDiff({ hash, loadDiff }), {
      wrapper,
      initialProps: { hash: "abc" },
    })

    await act(async () => result.current.selectFile("src/app.ts"))
    expect(result.current.selectedFile).toBe("src/app.ts")

    rerender({ hash: "def" })
    expect(result.current.selectedFile).toBe("")
    expect(result.current.diffText).toBe("")
  })

  it("does nothing without a commit", () => {
    const loadFiles = vi.fn()
    const { result } = renderHook(() => useCommitDiff({ hash: null, loadFiles }), { wrapper })
    expect(loadFiles).not.toHaveBeenCalled()
    expect(result.current.files).toEqual([])
  })
})
