import { useCallback, useMemo, useRef, useState } from "react"

export interface UndoEntry {
  id: string
  label: string
  run: () => Promise<unknown> | undefined
  at: number
}

const MAX_ENTRIES = 20

let sequence = 0

export function useUndoStack(limit = MAX_ENTRIES) {
  const undoRef = useRef<UndoEntry[]>([])
  const redoRef = useRef<UndoEntry[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)

  const sync = useCallback(() => {
    setCanUndo(undoRef.current.length > 0)
    setCanRedo(redoRef.current.length > 0)
  }, [])

  const push = useCallback(
    (label: string, run: () => Promise<unknown> | undefined) => {
      sequence += 1
      undoRef.current = [...undoRef.current.slice(-(limit - 1)), { id: `undo-${sequence}`, label, run, at: Date.now() }]
      redoRef.current = []
      setPendingLabel(label)
      sync()
    },
    [limit, sync],
  )

  const undo = useCallback((): UndoEntry | null => {
    const entry = undoRef.current.pop()
    if (!entry) return null
    redoRef.current = [...redoRef.current, entry]
    setPendingLabel(null)
    sync()
    return entry
  }, [sync])

  const redo = useCallback((): UndoEntry | null => {
    const entry = redoRef.current.pop()
    if (!entry) return null
    undoRef.current = [...undoRef.current, entry]
    sync()
    return entry
  }, [sync])

  const clear = useCallback(() => {
    undoRef.current = []
    redoRef.current = []
    setPendingLabel(null)
    sync()
  }, [sync])

  return useMemo(
    () => ({ push, undo, redo, clear, canUndo, canRedo, pendingLabel, setPendingLabel }),
    [push, undo, redo, clear, canUndo, canRedo, pendingLabel],
  )
}
