import { useCallback, useEffect, useState } from "react"
import type { TemplateDoc } from "../../../domain/entities/commit/commit-markdown"
import { BUILTIN_DOCS } from "../../../shared/constants/commit/commitMarkdown"
import { parseTemplateDoc } from "../../../main/adapters"
import { DEFAULT_TEMPLATE_FOLDER, gitApi } from "../../../infrastructure/git"

export interface GitIdentity {
  name: string
  email: string
}

const EMPTY_IDENTITY: GitIdentity = { name: "", email: "" }

function isTemplateDoc(value: TemplateDoc | null): value is TemplateDoc {
  return value !== null
}

export async function loadRepositoryTemplateDocs(repoPath: string): Promise<TemplateDoc[]> {
  if (!repoPath) return BUILTIN_DOCS
  try {
    const names = await gitApi.templateList(repoPath, DEFAULT_TEMPLATE_FOLDER)
    const repoDocs = await Promise.all(
      names.map(async (name) => {
        try {
          const content = await gitApi.templateRead(repoPath, DEFAULT_TEMPLATE_FOLDER, name)
          return parseTemplateDoc(`repo:${name}`, name.replace(/\.md$/, ""), "repo", content)
        } catch {
          return null
        }
      }),
    )
    return [...BUILTIN_DOCS, ...repoDocs.filter(isTemplateDoc)]
  } catch {
    return BUILTIN_DOCS
  }
}

export function useTemplateDocs(repoPath: string) {
  const [docs, setDocs] = useState<TemplateDoc[]>(BUILTIN_DOCS)
  const [identity, setIdentity] = useState<GitIdentity>(EMPTY_IDENTITY)

  const reloadDocs = useCallback(async () => {
    setDocs(await loadRepositoryTemplateDocs(repoPath))
  }, [repoPath])

  useEffect(() => {
    void reloadDocs()
  }, [reloadDocs])

  useEffect(() => {
    if (!repoPath) {
      setIdentity(EMPTY_IDENTITY)
      return
    }
    let alive = true
    gitApi
      .identity(repoPath)
      .then((id) => {
        if (alive) setIdentity({ name: id.name, email: id.email })
      })
      .catch(() => {
        if (alive) setIdentity(EMPTY_IDENTITY)
      })
    return () => {
      alive = false
    }
  }, [repoPath])

  return { docs, identity, reloadDocs }
}
