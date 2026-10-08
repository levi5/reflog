import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { ConflictFile } from "../../../src/types"
import { useMerge } from "../../../src/presentation/hooks/merge/useMerge"
import type { RunAction } from "../../../src/presentation/hooks/repository/action-types"

const repo = "/tmp/repo"

function conflict(path: string, content: string): ConflictFile {
  return { path, abs_path: `/repo/${path}`, content, conflicts: [] }
}

function renderMerge(initial: ConflictFile[]) {
  const setConflicts = vi.fn()
  const deps = {
    lang: "en" as const,
    repo,
    status: null,
    conflicts: initial,
    setConflicts,
    refresh: vi.fn(async () => {}),
    runAction: vi.fn() as unknown as RunAction,
    setBusy: vi.fn(),
    setMsg: vi.fn(),
    readCommitMessage: () => "",
    clearCommitMessage: vi.fn(),
  }
  return renderHook((props: { conflicts: ConflictFile[] }) => useMerge({ ...deps, conflicts: props.conflicts }), {
    initialProps: { conflicts: initial },
  })
}

describe("conflict editor does not discard unsaved edits", () => {
  it("keeps the typed buffer when a refresh brings the same file", () => {
    const onDisk = conflict("src/app.ts", "<<<<<<< HEAD\noriginal\n=======\ntheirs\n>>>>>>> branch")
    const { result, rerender } = renderMerge([onDisk])

    act(() => result.current.setEditorContent("my manual resolution"))

    rerender({ conflicts: [onDisk] })

    expect(result.current.editorContent).toBe("my manual resolution")
  })

  it("keeps the buffer when the refresh brings new content from disk", () => {
    const before = conflict("src/app.ts", "old content")
    const { result, rerender } = renderMerge([before])

    act(() => result.current.setEditorContent("work in progress"))

    rerender({ conflicts: [conflict("src/app.ts", "new content from disk")] })

    expect(result.current.editorContent).toBe("work in progress")
  })

  it("keeps the buffer even when the user clears the field to rewrite", () => {
    const onDisk = conflict("src/app.ts", "original content")
    const { result, rerender } = renderMerge([onDisk])

    act(() => result.current.setEditorContent(""))

    rerender({ conflicts: [onDisk] })

    expect(result.current.editorContent).toBe("")
  })

  it("reloads the buffer when the active file leaves the list", () => {
    const first = conflict("a.ts", "content of a")
    const second = conflict("b.ts", "content of b")
    const { result, rerender } = renderMerge([first, second])

    act(() => result.current.setEditorContent("editing a"))
    expect(result.current.editorContent).toBe("editing a")

    rerender({ conflicts: [second] })

    expect(result.current.activeConflict).toBe("b.ts")
    expect(result.current.editorContent).toBe("content of b")
  })

  it("reloads the disk content when the user edited nothing", () => {
    const { result, rerender } = renderMerge([conflict("a.ts", "version 1")])

    rerender({ conflicts: [conflict("a.ts", "version 2")] })

    expect(result.current.editorContent).toBe("version 2")
  })

  it("selectConflictFile switches the file and discards the previous draft", () => {
    const { result } = renderMerge([conflict("a.ts", "content of a"), conflict("b.ts", "content of b")])

    act(() => result.current.selectConflictFile("b.ts"))

    expect(result.current.activeConflict).toBe("b.ts")
    expect(result.current.editorContent).toBe("content of b")
  })
})
