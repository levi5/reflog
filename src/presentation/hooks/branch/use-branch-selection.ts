import { useMemo } from "react"
import type { BranchInfo } from "../../../types"
import { useFileSelection } from "../staging/use-file-selection"

export const isBranchSelectable = (branch: BranchInfo): boolean => !branch.remote && !branch.current

export function useBranchSelection(branches: readonly BranchInfo[], resetKey: string) {
  const names = useMemo(() => branches.filter(isBranchSelectable).map((branch) => branch.name), [branches])
  const { checked, toggle, selectAll, clear } = useFileSelection(names, resetKey)
  return { checked, toggle, selectAll, clear }
}
