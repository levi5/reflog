import { commitMarkdownUseCase, commitTemplateUseCase } from "../../../data"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { TemplateDoc } from "../../../domain/entities/commit/commit-markdown"
import { BUILTIN_DOCS } from "../../../shared/constants/commit/commitMarkdown"
import type { CommitFields, CommitPreset, LintCode } from "../../../domain/entities/commit/commit-template"
import { EMPTY_FIELDS } from "../../../shared/constants/commit/commitTemplate"
import { useCommitConfig } from "../../context"
import { useTemplateDocs } from "./useTemplateDocs"

interface Options {
  value: string
  onChange: (v: string) => void
  repoPath?: string
  branch?: string
}

export function useCommitTemplate({ value, onChange, repoPath, branch }: Options) {
  const [fields, setFields] = useState<CommitFields>(() =>
    value.trim() ? commitTemplateUseCase.parseConventional(value) : { ...EMPTY_FIELDS },
  )
  const { prefs, presets, history, savePrefs, pushHistory } = useCommitConfig()
  const [showBody, setShowBody] = useState(false)
  const formattedRef = useRef("")
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const lastExternalValueRef = useRef(value)
  const lastEmittedRef = useRef<string | null>(null)
  const branchName = branch ?? ""
  const repo = repoPath ?? ""
  const { docs, identity } = useTemplateDocs(repo)

  const activeDoc = useMemo(
    () => docs.find((doc) => doc.id === prefs.templateId) ?? BUILTIN_DOCS[0],
    [docs, prefs.templateId],
  )

  const formatted = useMemo(() => {
    if (!activeDoc?.pattern) return commitTemplateUseCase.formatCommit(fields)
    return commitMarkdownUseCase.renderTemplate(
      activeDoc.pattern,
      commitMarkdownUseCase.buildVars(fields, {
        branch: branchName,
        author: identity.name,
        email: identity.email,
      }),
    )
  }, [fields, activeDoc, branchName, identity])
  formattedRef.current = formatted

  useEffect(() => {
    commitTemplateUseCase.setLastCommitOpts({ signoff: fields.signoff, sign: fields.sign })
  }, [fields.signoff, fields.sign])

  useEffect(() => {
    if (value === lastEmittedRef.current) return
    if (value !== lastExternalValueRef.current) {
      lastExternalValueRef.current = value
      if (value.trim()) {
        setFields(commitTemplateUseCase.parseConventional(value))
        return
      }
      setFields((current) =>
        current.subject || current.body || current.footer
          ? { ...current, subject: "", body: "", footer: "", breaking: false }
          : current,
      )
      return
    }
    if (value !== formatted) {
      lastEmittedRef.current = formatted
      onChangeRef.current(formatted)
    }
  }, [formatted, value])

  const setField = useCallback(<K extends keyof CommitFields>(key: K, nextValue: CommitFields[K]) => {
    setFields((current) => (current[key] === nextValue ? current : { ...current, [key]: nextValue }))
  }, [])

  const applyPreset = useCallback((preset: CommitPreset) => {
    setFields((current) => ({
      ...current,
      type: preset.type,
      scope: preset.scope,
      subject: preset.subject || current.subject,
      body: preset.body || current.body,
      footer: preset.footer || current.footer,
    }))
  }, [])

  const setActiveTemplate = useCallback(
    (id: string) => {
      savePrefs({ ...prefs, templateId: id })
    },
    [prefs, savePrefs],
  )

  const applyDocTemplate = useCallback(
    (doc: TemplateDoc) => {
      setFields((current) => ({
        ...current,
        type: doc.defaults.type || current.type,
        scope: doc.defaults.scope || current.scope,
      }))
      setActiveTemplate(doc.id)
    },
    [setActiveTemplate],
  )

  const inferred = useMemo(() => (branchName ? commitMarkdownUseCase.inferFromBranch(branchName) : null), [branchName])

  const inferBranch = useCallback(() => {
    if (!inferred) return
    setFields((current) => ({
      ...current,
      type: current.type || inferred.type || "",
      scope: current.scope || inferred.scope || "",
    }))
  }, [inferred])

  const applyHistory = useCallback((msg: string) => {
    setFields(commitTemplateUseCase.parseConventional(msg))
  }, [])

  const recordCommit = useCallback(() => {
    const msg = formattedRef.current.trim()
    if (!msg) return
    pushHistory(msg)
    setFields((current) => ({
      ...current,
      subject: "",
      body: "",
      footer: "",
      breaking: false,
    }))
  }, [pushHistory])

  const errors: LintCode[] = useMemo(() => commitTemplateUseCase.lintCommit(fields, prefs), [fields, prefs])
  const canCommit = fields.subject.trim().length > 0 && !errors.includes("typeRequired")

  return {
    fields,
    setField,
    prefs,
    presets,
    docs,
    activeDocId: activeDoc.id,
    history,
    showBody,
    setShowBody,
    formatted,
    errors,
    canCommit,
    branch: branchName,
    canInfer: Boolean(inferred && (inferred.type || inferred.scope)),
    applyPreset,
    applyDocTemplate,
    setActiveTemplate,
    inferBranch,
    applyHistory,
    recordCommit,
  }
}

export type CommitTemplateApi = ReturnType<typeof useCommitTemplate>
