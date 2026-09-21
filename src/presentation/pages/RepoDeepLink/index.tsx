import { useEffect } from "react"
import { useLoaderData, useNavigate, useSearchParams } from "react-router-dom"
import { Spinner } from "../../components/Animation/Spinner"
import { useRepo } from "../../context"

interface RepoLoaderData {
  repoPath: string
  view: string
}

const VIEW_TO_PATH: Record<string, string> = {
  staging: "staging",
  graph: "graph",
  blame: "blame",
  merge: "merge",
  visualize: "visualize",
  monitors: "monitors",
  templates: "templates",
  automation: "automation",
}

export function RepoDeepLink() {
  const { repoPath, view } = useLoaderData() as RepoLoaderData
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const repo = useRepo()
  const file = searchParams.get("file")
  const hash = searchParams.get("hash")
  const section = searchParams.get("section")
  const currentRepo = repo.repo
  const handleOpen = repo.handleOpen

  useEffect(() => {
    let cancelled = false
    async function open() {
      if (currentRepo !== repoPath) {
        try {
          await handleOpen(repoPath)
        } catch {
          if (cancelled) return
        }
      }
      if (cancelled) return
      const target = VIEW_TO_PATH[view] ?? "staging"
      const next = new URLSearchParams()
      if (file) next.set("file", file)
      if (hash) next.set("hash", hash)
      if (section) next.set("section", section)
      const qs = next.toString()
      navigate(`/${target}${qs ? `?${qs}` : ""}`, { replace: true })
    }
    void open()
    return () => {
      cancelled = true
    }
  }, [repoPath, view, file, hash, section, currentRepo, handleOpen, navigate])

  return <Spinner />
}
