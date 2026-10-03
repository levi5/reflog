import { useEffect, useMemo, useRef, useState } from "react"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { IGitApi } from "../../../infrastructure/git/types"

export function useRepoScope(repo: string, git: IGitApi = defaultGitApi) {
  const [chain, setChain] = useState<string[]>([])
  const requestRef = useRef(0)

  useEffect(() => {
    const request = requestRef.current + 1
    requestRef.current = request
    if (!repo.trim()) {
      setChain([])
      return
    }
    git
      .superprojectChain(repo)
      .then((entries) => {
        if (request === requestRef.current) setChain(entries.filter((entry) => Boolean(entry.trim())))
      })
      .catch(() => {
        if (request === requestRef.current) setChain([])
      })
  }, [repo, git])

  const parent = useMemo(() => (chain.length > 1 ? chain[chain.length - 2] : ""), [chain])

  return { chain, parent, isSubmodule: chain.length > 1 }
}
