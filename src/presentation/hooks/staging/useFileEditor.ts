import { _Either } from "funcio"
import { useCallback, useState } from "react"
import type { Lang } from "../../../types"
import { t } from "../../../i18n"
import { gitApi } from "../../../infrastructure/git"
import type { RunAction } from "../repository/action-types"

const MAX_EDITABLE_BYTES = 1024 * 1024

export interface FileEditorDeps {
  lang: Lang
  repo: string
  runAction: RunAction
  requestConfirm: (title: string, message: string) => Promise<boolean>
  setMsg: (m: string) => void
  onFileSaved?: (file: string) => void
}

export function useFileEditor(deps: FileEditorDeps) {
  const { lang, repo, runAction, requestConfirm, setMsg, onFileSaved } = deps
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editDraft, setEditDraft] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  const openEditor = useCallback(
    async (file: string) => {
      if (!repo || !file || editLoading) return
      setEditLoading(true)

      const result = await _Either.try.async(() => gitApi.fileContent(repo, file))
      setEditLoading(false)

      if (result.isLeft()) {
        setMsg(String(result.value))
        return
      }

      const content = result.value as string
      if (content.includes("\0")) {
        setMsg(t(lang, "binaryNoEdit"))
        return
      }

      if (content.length > MAX_EDITABLE_BYTES) {
        setMsg(t(lang, "fileTooLarge"))
        return
      }

      setEditContent(content)
      setEditDraft(content)
      setEditingFile(file)
    },
    [repo, lang, editLoading, setMsg],
  )

  const closeEditor = useCallback(async () => {
    if (editingFile === null) return
    if (editDraft !== editContent) {
      const confirmed = await requestConfirm(t(lang, "discardChanges"), t(lang, "discardChangesHint"))
      if (!confirmed) return
    }
    setEditingFile(null)
  }, [editingFile, editDraft, editContent, lang, requestConfirm])

  const saveEditor = useCallback(() => {
    if (!repo || editingFile === null) return Promise.resolve()
    const file = editingFile
    const content = editDraft
    return runAction(
      () => gitApi.saveContent(repo, file, content),
      () => {
        setEditingFile(null)
        onFileSaved?.(file)
      },
      {
        loadingMessage: t(lang, "savingFile"),
        successMessage: t(lang, "fileSaved"),
      },
    )
  }, [repo, editingFile, editDraft, lang, runAction, onFileSaved])

  return {
    editingFile,
    editContent,
    editDraft,
    setEditDraft,
    editLoading,
    openEditor,
    closeEditor,
    saveEditor,
  }
}
