import { type Dispatch, type SetStateAction, useCallback, useMemo } from "react"
import { commitMarkdownUseCase, commitTemplateUseCase } from "../../../data"
import type { CommitFields, CommitPreset } from "../../../domain/entities/commit/commit-template"
import type { TemplateDoc } from "../../../domain/entities/commit/commit-markdown"

interface PresetManagerOptions {
  presets: CommitPreset[]
  savePresets: (presets: CommitPreset[]) => void
  setEditingPreset: Dispatch<SetStateAction<CommitPreset | null>>
  setViewTab: (tab: "templates" | "presets") => void
  draft: TemplateDoc | null
  identity: { name: string; email: string }
}

const SAMPLE_FIELDS: CommitFields = {
  type: "feat",
  scope: "app",
  subject: "implement commit templates UI",
  body: "Add template editor with live preview, variable chips and commit preferences.",
  footer: "Refs #42",
  breaking: false,
  coauthor: "Reflog Team <team@reflog.dev>",
  signoff: false,
  sign: false,
}

export function useCommitPresets({
  presets,
  savePresets,
  setEditingPreset,
  setViewTab,
  draft,
  identity,
}: PresetManagerOptions) {
  const addPreset = useCallback((preset: CommitPreset) => savePresets([...presets, preset]), [presets, savePresets])

  const startEditPreset = useCallback(
    (preset: CommitPreset) => {
      setEditingPreset(preset)
      setViewTab("presets")
    },
    [setEditingPreset, setViewTab],
  )

  const cancelEditPreset = useCallback(() => setEditingPreset(null), [setEditingPreset])

  const updatePreset = useCallback(
    (preset: CommitPreset) => {
      savePresets(presets.map((candidate) => (candidate.id === preset.id ? preset : candidate)))
      setEditingPreset(null)
    },
    [presets, savePresets, setEditingPreset],
  )

  const deletePreset = useCallback(
    (id: string) => {
      savePresets(presets.filter((candidate) => candidate.id !== id))
      setEditingPreset((current) => (current?.id === id ? null : current))
    },
    [presets, savePresets, setEditingPreset],
  )

  const livePreview = useMemo(() => {
    if (!draft) return ""
    if (!draft.pattern) return commitTemplateUseCase.formatCommit(SAMPLE_FIELDS)
    const vars = commitMarkdownUseCase.buildVars(SAMPLE_FIELDS, {
      branch: "feat/PROJ-1234-templates",
      author: identity.name || "Reflog User",
      email: identity.email || "user@example.com",
    })
    return commitMarkdownUseCase.renderTemplate(draft.pattern, vars)
  }, [draft, identity])

  return { addPreset, startEditPreset, cancelEditPreset, updatePreset, deletePreset, livePreview }
}
