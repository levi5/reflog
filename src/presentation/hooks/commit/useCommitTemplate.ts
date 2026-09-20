import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { TemplateDoc } from "../../../domain/entities/commit/commit-markdown"
import { BUILTIN_DOCS } from "../../../shared/constants/commit/commitMarkdown"
import {
  buildVars,
  formatCommit,
  inferFromBranch,
  lintCommit,
  parseConventional,
  renderTemplate,
  setLastCommitOpts,
} from "../../../main/adapters"
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
    value.trim() ? parseConventional(value) : { ...EMPTY_FIELDS },
  )
  const { prefs, presets, history, savePrefs, pushHistory } = useCommitConfig()
  const [showBody, setShowBody] = useState(false)
  const formattedRef = useRef("")
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const branchName = branch ?? ""
  const repo = repoPath ?? ""
  const { docs, identity } = useTemplateDocs(repo)

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === prefs.templateId) ?? BUILTIN_DOCS[0],
    [docs, prefs.templateId],
  )

  const formatted = useMemo(() => {
    if (!activeDoc?.pattern) return formatCommit(fields)
    return renderTemplate(
      activeDoc.pattern,
      buildVars(fields, {
        branch: branchName,
        author: identity.name,
        email: identity.email,
      }),
    )
  }, [fields, activeDoc, branchName, identity])
  formattedRef.current = formatted

  useEffect(() => {
    setLastCommitOpts({ signoff: fields.signoff, sign: fields.sign })
  }, [fields.signoff, fields.sign])

  useEffect(() => {
    if (value !== formatted) onChangeRef.current(formatted)
  }, [formatted, value])

  useEffect(() => {
    if (value === "") {
      setFields((f) =>
        f.subject || f.body || f.footer ? { ...f, subject: "", body: "", footer: "", breaking: false } : f,
      )
    }
  }, [value])

  const setField = useCallback(<K extends keyof CommitFields>(key: K, v: CommitFields[K]) => {
    setFields((f) => (f[key] === v ? f : { ...f, [key]: v }))
  }, [])

  const applyPreset = useCallback((p: CommitPreset) => {
    setFields((f) => ({
      ...f,
      type: p.type,
      scope: p.scope,
      subject: p.subject || f.subject,
      body: p.body || f.body,
      footer: p.footer || f.footer,
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
      setFields((f) => ({
        ...f,
        type: doc.defaults.type || f.type,
        scope: doc.defaults.scope || f.scope,
      }))
      setActiveTemplate(doc.id)
    },
    [setActiveTemplate],
  )

  const inferred = useMemo(() => (branchName ? inferFromBranch(branchName) : null), [branchName])

  const inferBranch = useCallback(() => {
    if (!inferred) return
    setFields((f) => ({
      ...f,
      type: f.type || inferred.type || "",
      scope: f.scope || inferred.scope || "",
    }))
  }, [inferred])

  const applyHistory = useCallback((msg: string) => {
    setFields(parseConventional(msg))
  }, [])

  const recordCommit = useCallback(() => {
    const msg = formattedRef.current.trim()
    if (!msg) return
    pushHistory(msg)
    setFields((f) => ({
      ...f,
      subject: "",
      body: "",
      footer: "",
      breaking: false,
    }))
  }, [pushHistory])

  const errors: LintCode[] = useMemo(() => lintCommit(fields, prefs), [fields, prefs])
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
