import { _Either } from "funcio"
import { useCallback, useEffect, useState } from "react"
import { gitApi } from "../../../infrastructure/git"
import type { SubmoduleInfo } from "../../../types"

export function useSubmodules(repoRoot: string) {
  const [submodules, setSubmodules] = useState<SubmoduleInfo[]>([])
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    if (!repoRoot) {
      setSubmodules([])
      return
    }
    const box = await _Either.try.async(() => gitApi.submodules(repoRoot))
    const values = box.isRight() ? (box.value as SubmoduleInfo[]) : []
    const errorMsg = box.isLeft() ? String(box.value) : ""

    setSubmodules(values)
    setError(errorMsg)
  }, [repoRoot])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { submodules, error, refresh }
}
