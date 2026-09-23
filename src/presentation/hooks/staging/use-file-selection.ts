import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { applyRange, pruneChecked, rangeBetween, toggleChecked } from "./file-selection"

const EMPTY: ReadonlySet<string> = new Set()

export function useFileSelection(paths: readonly string[], resetKey: string) {
  const [checked, setChecked] = useState<ReadonlySet<string>>(EMPTY)
  const anchorRef = useRef<string | null>(null)
  const keyRef = useRef(resetKey)

  useEffect(() => {
    if (keyRef.current === resetKey) return
    keyRef.current = resetKey
    anchorRef.current = null
    setChecked(EMPTY)
  }, [resetKey])

  const visible = useMemo(() => pruneChecked(checked, paths), [checked, paths])

  const toggle = useCallback(
    (path: string, range: boolean) => {
      const anchor = anchorRef.current
      anchorRef.current = path
      return setChecked((prev) =>
        range && anchor !== null && anchor !== path
          ? applyRange(prev, rangeBetween(paths, anchor, path), !prev.has(anchor))
          : toggleChecked(prev, path),
      )
    },
    [paths],
  )

  const clear = useCallback(() => {
    anchorRef.current = null
    setChecked(EMPTY)
  }, [])

  return { checked: visible, toggle, clear }
}
