import { useCallback, useMemo, useRef, useState } from "react"
import type { TemplateDoc } from "../../../domain/entities/commit/commit-markdown"
import { BUILTIN_DOCS, EXAMPLE_TEMPLATE, STANDARD_ID } from "../../../shared/constants//commit/commitMarkdown"
import { buildVars, formatCommit, parseTemplateDoc, renderTemplate } from "../../../main/adapters"
import type { CommitFields, CommitPreset } from "../../../domain/entities/commit/commit-template"
import { t } from "../../../i18n"
import { DEFAULT_TEMPLATE_FOLDER, gitApi } from "../../../infrastructure/git"
import { newId } from "../../../shared/utils/id"
import type { Lang } from "../../../types"
import { cleanTemplateFileName, serializeTemplateDoc, type ViewTab } from "../../pages/Templates/types"
import { useCommitConfig, useTranslation } from "../../context"
import { useTemplateDocs } from "./useTemplateDocs"

interface UseTemplateManagerOptions {
  lang?: Lang
  repoPath: string
}

export function useTemplateManager({ lang: propLang, repoPath }: UseTemplateManagerOptions) {
  const { lang: contextLang } = useTranslation()
  const lang = propLang ?? contextLang
  const [viewTab, setViewTab] = useState<ViewTab>("templates")
  const { docs, identity, reloadDocs } = useTemplateDocs(repoPath)
  const [selectedId, setSelectedId] = useState<string | null>(STANDARD_ID)
  const [draft, setDraft] = useState<TemplateDoc | null>(BUILTIN_DOCS[0])
  const { prefs, presets, savePrefs, savePresets } = useCommitConfig()
  const [editingPreset, setEditingPreset] = useState<CommitPreset | null>(null)
  const [page, setPage] = useState(0)
  const [feedback, setFeedback] = useState<string>("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<TemplateDoc | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSelectDoc = useCallback((doc: TemplateDoc) => {
    setSelectedId(doc.id)
    setDraft({ ...doc, defaults: { ...doc.defaults } })
    setFeedback("")
  }, [])

  const handleCreateNew = useCallback(() => {
    const newDoc: TemplateDoc = {
      id: newId("repo:new"),
      name: "new-template",
      source: "repo",
      defaults: { type: "feat", scope: "" },
      pattern: "{{header}}\n\n{{#body}}{{body}}\n\n{{/body}}{{#footer}}{{footer}}{{/footer}}",
    }
    setSelectedId(newDoc.id)
    setDraft(newDoc)
    setFeedback("")
    setViewTab("templates")
  }, [])

  const handleLoadExample = useCallback(() => {
    const exampleDoc = parseTemplateDoc(newId("repo:jira-example"), "jira-issue", "repo", EXAMPLE_TEMPLATE)
    setSelectedId(exampleDoc.id)
    setDraft(exampleDoc)
    setFeedback("")
    setViewTab("templates")
  }, [])

  const handleDuplicate = useCallback(() => {
    if (!draft) return
    const duplicated: TemplateDoc = {
      ...draft,
      id: newId(`repo:${draft.name}-copy`),
      name: `${draft.name}-copy`,
      source: "repo",
      defaults: { ...draft.defaults },
    }
    setSelectedId(duplicated.id)
    setDraft(duplicated)
    setFeedback("")
  }, [draft])

  const handleSaveTemplate = useCallback(async () => {
    if (!draft) return
    if (!repoPath) {
      setFeedback(t(lang, "noRepo"))
      return
    }
    if (!draft.name.trim()) {
      setFeedback(t(lang, "templateInvalidName"))
      return
    }

    const fileName = cleanTemplateFileName(draft.name)
    const fileContent = serializeTemplateDoc(draft.name, draft.defaults.type, draft.defaults.scope, draft.pattern)

    try {
      await gitApi.templateWrite(repoPath, DEFAULT_TEMPLATE_FOLDER, fileName, fileContent)
      setFeedback(t(lang, "templateSaved"))
      await reloadDocs()
      setSelectedId(`repo:${fileName}`)
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : String(err))
    }
  }, [draft, repoPath, lang, reloadDocs])

  const handleRequestDeleteTemplate = useCallback(
    (doc?: TemplateDoc) => {
      const target = doc ?? draft
      if (target?.source !== "repo") return
      setTemplateToDelete(target)
      setDeleteOpen(true)
    },
    [draft],
  )

  const handleDeleteTemplate = useCallback(async () => {
    const target = templateToDelete ?? (draft?.source === "repo" ? draft : null)
    if (target?.source !== "repo" || !repoPath) return
    const fileName = cleanTemplateFileName(target.name)
    try {
      await gitApi.templateDelete(repoPath, DEFAULT_TEMPLATE_FOLDER, fileName)
      setFeedback(t(lang, "templateDeleted"))
      setDeleteOpen(false)
      setTemplateToDelete(null)
      await reloadDocs()
      if (selectedId === target.id) {
        const fallback = BUILTIN_DOCS[0]
        setSelectedId(fallback.id)
        setDraft(fallback)
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : String(err))
    }
  }, [templateToDelete, draft, repoPath, lang, reloadDocs, selectedId])

  const handleToggleActiveTemplate = useCallback(
    (isActive: boolean) => {
      if (!draft) return
      const targetId = isActive ? draft.id : STANDARD_ID
      savePrefs({ ...prefs, templateId: targetId })
    },
    [draft, prefs, savePrefs],
  )

  const handleSetActiveTemplate = useCallback(
    (templateId: string) => {
      savePrefs({ ...prefs, templateId })
    },
    [prefs, savePrefs],
  )

  const handleToggleStrict = useCallback(
    (checked: boolean) => {
      savePrefs({ ...prefs, strict: checked })
    },
    [prefs, savePrefs],
  )

  const handleToggleIcons = useCallback(
    (checked: boolean) => {
      savePrefs({ ...prefs, useIcons: checked })
    },
    [prefs, savePrefs],
  )

  const handleInsertVariable = useCallback(
    (token: string) => {
      if (!draft) return
      const textarea = textareaRef.current
      if (!textarea) {
        setDraft((prev) => (prev ? { ...prev, pattern: prev.pattern + token } : prev))
        return
      }

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentText = draft.pattern
      const nextText = currentText.substring(0, start) + token + currentText.substring(end)

      setDraft((prev) => (prev ? { ...prev, pattern: nextText } : prev))
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.selectionStart = start + token.length
        textarea.selectionEnd = start + token.length
      })
    },
    [draft],
  )

  const handleAddPreset = useCallback(
    (preset: CommitPreset) => {
      savePresets([...presets, preset])
    },
    [presets, savePresets],
  )

  const handleStartEditPreset = useCallback((preset: CommitPreset) => {
    setEditingPreset(preset)
    setViewTab("presets")
  }, [])

  const handleCancelEditPreset = useCallback(() => {
    setEditingPreset(null)
  }, [])

  const handleUpdatePreset = useCallback(
    (preset: CommitPreset) => {
      savePresets(presets.map((p) => (p.id === preset.id ? preset : p)))
      setEditingPreset(null)
    },
    [presets, savePresets],
  )

  const handleDeletePreset = useCallback(
    (id: string) => {
      savePresets(presets.filter((p) => p.id !== id))
      setEditingPreset((current) => (current?.id === id ? null : current))
    },
    [presets, savePresets],
  )

  const livePreview = useMemo(() => {
    if (!draft) return ""
    const sampleFields: CommitFields = {
      type: draft.defaults.type || "feat",
      scope: draft.defaults.scope || "app",
      subject: "implement commit templates UI",
      body: "Add template editor with live preview, variable chips and commit preferences.",
      footer: "Refs #42",
      breaking: false,
      coauthor: "Reflog Team <team@reflog.dev>",
      signoff: false,
      sign: false,
    }

    if (!draft.pattern) {
      return formatCommit(sampleFields)
    }

    const vars = buildVars(sampleFields, {
      branch: "feat/PROJ-1234-templates",
      author: identity.name || "Reflog User",
      email: identity.email || "user@example.com",
    })
    return renderTemplate(draft.pattern, vars)
  }, [draft, identity])

  return {
    viewTab,
    setViewTab,
    docs,
    selectedId,
    draft,
    setDraft,
    prefs,
    presets,
    page,
    setPage,
    feedback,
    deleteOpen,
    setDeleteOpen,
    templateToDelete,
    textareaRef,
    livePreview,
    handleSelectDoc,
    handleCreateNew,
    handleLoadExample,
    handleDuplicate,
    handleSaveTemplate,
    handleRequestDeleteTemplate,
    handleDeleteTemplate,
    handleToggleActiveTemplate,
    handleSetActiveTemplate,
    handleToggleStrict,
    handleToggleIcons,
    handleInsertVariable,
    editingPreset,
    handleStartEditPreset,
    handleCancelEditPreset,
    handleUpdatePreset,
    handleAddPreset,
    handleDeletePreset,
  }
}
