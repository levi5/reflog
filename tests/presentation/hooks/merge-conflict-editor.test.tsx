// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { ConflictFile } from "../../../src/types"
import { useMerge } from "../../../src/presentation/hooks/merge/useMerge"
import type { RunAction } from "../../../src/presentation/hooks/repository/action-types"

const repo = "/tmp/repo"

function conflict(path: string, content: string): ConflictFile {
  return { path, content, conflicts: 1 }
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

describe("o editor de conflito nao descarta edicoes nao salvas", () => {
  it("mantem o buffer digitado quando um refresh traz o mesmo arquivo", () => {
    const onDisk = conflict("src/app.ts", "<<<<<<< HEAD\noriginal\n=======\nremoto\n>>>>>>> branch")
    const { result, rerender } = renderMerge([onDisk])

    act(() => result.current.setEditorContent("minha resolucao manual"))

    rerender({ conflicts: [onDisk] })

    expect(result.current.editorContent).toBe("minha resolucao manual")
  })

  it("mantem o buffer quando o refresh traz conteudo novo do disco", () => {
    const before = conflict("src/app.ts", "conteudo antigo")
    const { result, rerender } = renderMerge([before])

    act(() => result.current.setEditorContent("trabalho em andamento"))

    rerender({ conflicts: [conflict("src/app.ts", "conteudo novo em disco")] })

    expect(result.current.editorContent).toBe("trabalho em andamento")
  })

  it("mantem o buffer mesmo quando o usuario limpa o campo para reescrever", () => {
    const onDisk = conflict("src/app.ts", "conteudo original")
    const { result, rerender } = renderMerge([onDisk])

    act(() => result.current.setEditorContent(""))

    rerender({ conflicts: [onDisk] })

    expect(result.current.editorContent).toBe("")
  })

  it("recarrega o buffer quando o arquivo ativo sai da lista", () => {
    const first = conflict("a.ts", "conteudo de a")
    const second = conflict("b.ts", "conteudo de b")
    const { result, rerender } = renderMerge([first, second])

    act(() => result.current.setEditorContent("editando a"))
    expect(result.current.editorContent).toBe("editando a")

    rerender({ conflicts: [second] })

    expect(result.current.activeConflict).toBe("b.ts")
    expect(result.current.editorContent).toBe("conteudo de b")
  })

  it("recarrega o conteudo do disco quando o usuario nao editou nada", () => {
    const { result, rerender } = renderMerge([conflict("a.ts", "versao 1")])

    rerender({ conflicts: [conflict("a.ts", "versao 2")] })

    expect(result.current.editorContent).toBe("versao 2")
  })

  it("selectConflictFile troca o arquivo e descarta o rascunho do anterior", () => {
    const { result } = renderMerge([conflict("a.ts", "conteudo de a"), conflict("b.ts", "conteudo de b")])

    act(() => result.current.selectConflictFile("b.ts"))

    expect(result.current.activeConflict).toBe("b.ts")
    expect(result.current.editorContent).toBe("conteudo de b")
  })
})
