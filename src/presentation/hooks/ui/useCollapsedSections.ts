import { useCallback, useEffect, useState } from "react"
import { readVersionedRaw, writeVersionedRaw } from "../../../infrastructure/storage/versioned-storage"

function storageKey(key: string): string {
  return `collapsed.${key}`
}

function readCollapsed<T extends string>(key: string): ReadonlySet<T> {
  const raw = readVersionedRaw(storageKey(key))
  return new Set((raw ?? "").split(",").filter(Boolean) as T[])
}

export function useCollapsedSections<T extends string>(key: string) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<T>>(() => readCollapsed<T>(key))

  useEffect(() => {
    writeVersionedRaw(storageKey(key), [...collapsed].join(","))
  }, [collapsed, key])

  const toggle = useCallback((id: T) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  return { collapsed, toggle }
}
