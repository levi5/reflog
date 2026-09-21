import { _try } from "funcio"
import { z } from "zod"
import type { IStorage } from "../../data/protocols/storage"
import { readVersionedRaw, versionedKey, writeVersionedRaw } from "./versioned-storage"

function normalizeKey(key: string): string {
  if (key.startsWith("reflog:v1:")) return key.slice("reflog:v1:".length)
  return key
}

function readMigrated(key: string): string | null {
  const migrated = readVersionedRaw(normalizeKey(key))
  if (migrated !== null) return migrated
  try {
    if (typeof window === "undefined" || !window.localStorage) return null
    const legacy = window.localStorage.getItem(key)
    if (legacy !== null && versionedKey(normalizeKey(key)) !== key) {
      writeVersionedRaw(normalizeKey(key), legacy)
      window.localStorage.removeItem(key)
    }
    return legacy
  } catch {
    return null
  }
}

export class LocalStorageAdapter implements IStorage {
  public get<T>(key: string, fallback: T): T {
    const box = _try.sync(() => {
      const raw = readMigrated(key)
      if (raw === null) return fallback
      try {
        return JSON.parse(raw) as T
      } catch {
        const stringSchema = z.string() as unknown as z.ZodType<T>
        const parsed = stringSchema.safeParse(raw)
        return parsed.success ? parsed.data : fallback
      }
    })

    if (box.isRight()) return box.value as T

    return fallback
  }

  public set<T>(key: string, value: T): void {
    _try.sync(() => {
      writeVersionedRaw(normalizeKey(key), JSON.stringify(value))
    })
  }

  public remove(key: string): void {
    _try.sync(() => {
      if (typeof window === "undefined" || !window.localStorage) return
      window.localStorage.removeItem(versionedKey(normalizeKey(key)))
      if (key !== versionedKey(normalizeKey(key))) window.localStorage.removeItem(key)
    })
  }
}

export const localStorageAdapter = new LocalStorageAdapter()
