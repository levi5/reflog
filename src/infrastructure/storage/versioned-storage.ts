import { useCallback, useEffect, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { z } from "zod"

export const STORAGE_VERSION = "v1" as const
export const STORAGE_PREFIX = `reflog:${STORAGE_VERSION}:` as const
export const DEBOUNCE_MS = 300 as const

export function versionedKey(key: string): string {
  if (key.startsWith("reflog:")) {
    if (key.startsWith("reflog.size.")) return `${STORAGE_PREFIX}size.${key.slice("reflog.size.".length)}`
    if (key.startsWith("reflog.window.")) return `${STORAGE_PREFIX}window.${key.slice("reflog.window.".length)}`
    if (key.startsWith("reflog:v1:")) return key
    return `${STORAGE_PREFIX}${key.slice("reflog.".length)}`
  }
  const mapped = LEGACY_KEY_MAP[key]
  if (mapped) return `${STORAGE_PREFIX}${mapped}`
  if (key.startsWith("forgegit.")) return `${STORAGE_PREFIX}${key.slice("forgegit.".length)}`
  return `${STORAGE_PREFIX}${key}`
}

const LEGACY_KEY_MAP: Record<string, string> = {
  "forgegit.lang": "lang",
  "forgegit.theme": "theme",
  "forgegit.accent": "accent",
  "forgegit.fontsize": "font-size",
  "forgegit.reopenLast": "reopen-last",
  "forgegit.recents": "recents",
  "forgegit.automations": "automations",
  "forgegit.profiles": "profiles",
  "forgegit.profile.active": "profile.active",
  "forgegit.commit.prefs": "commit.prefs",
  "forgegit.commit.presets": "commit.presets",
  "forgegit.commit.history": "commit.history",
  "viz.console": "viz.console",
  "viz.detail": "viz.detail",
  "commit.detail": "commit.detail",
  "reflog.window.maximized": "window.maximized",
}

function safeGet(key: string): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return
    window.localStorage.removeItem(key)
  } catch {
    return
  }
}

export function readVersionedRaw(key: string): string | null {
  const vKey = versionedKey(key)
  const direct = safeGet(vKey)
  if (direct !== null) return direct
  for (const [legacy, mapped] of Object.entries(LEGACY_KEY_MAP)) {
    if (mapped === key || versionedKey(mapped) === vKey) {
      const old = safeGet(legacy)
      if (old !== null) {
        safeSet(vKey, old)
        safeRemove(legacy)
        return old
      }
    }
  }
  if (!key.startsWith("reflog:")) {
    const legacySized = safeGet(`reflog.size.${key}`)
    if (legacySized !== null) return legacySized
  }
  return null
}

export function writeVersionedRaw(key: string, value: string): void {
  safeSet(versionedKey(key), value)
}

export function removeVersioned(key: string): void {
  safeRemove(versionedKey(key))
}

export function readVersioned<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  const raw = readVersionedRaw(key)
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = schema.safeParse(parsed)
    return result.success ? result.data : fallback
  } catch {
    const result = schema.safeParse(raw as unknown)
    return result.success ? result.data : fallback
  }
}

export function readVersionedString(key: string, fallback = ""): string {
  const raw = readVersionedRaw(key)
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === "string" ? parsed : raw
  } catch {
    return raw
  }
}

export function writeVersioned<T>(key: string, value: T): void {
  try {
    writeVersionedRaw(key, JSON.stringify(value))
  } catch {
    return
  }
}

export function writeVersionedString(key: string, value: string): void {
  writeVersionedRaw(key, value)
}

export function debounce<F extends (...args: never[]) => void>(fn: F, wait = DEBOUNCE_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const debounced = (...args: Parameters<F>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
  }
  return debounced
}

export function useVersionedState<T>(
  key: string,
  initial: T,
  schema: z.ZodType<T>,
  options: { debounceMs?: number } = {},
): [T, Dispatch<SetStateAction<T>>] {
  const { debounceMs = DEBOUNCE_MS } = options
  const [value, setValue] = useState<T>(() => readVersioned(key, schema, initial))
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const snapshot = value
    timerRef.current = setTimeout(() => {
      writeVersioned(key, snapshot)
    }, debounceMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [key, value, debounceMs])

  useEffect(() => {
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key !== versionedKey(key)) return
      if (storageEvent.newValue === null) {
        setValue(initial)
        return
      }
      try {
        const parsed: unknown = JSON.parse(storageEvent.newValue)
        const result = schema.safeParse(parsed)
        if (result.success) setValue(result.data)
      } catch {
        return
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [key, initial, schema])

  return [value, setValue]
}

export function useVersionedString(
  key: string,
  initial: string,
  options: { debounceMs?: number } = {},
): [string, (next: string | ((previous: string) => string)) => void] {
  const { debounceMs = DEBOUNCE_MS } = options
  const [value, setValue] = useState<string>(() => {
    const raw = readVersionedRaw(key)
    return raw ?? initial
  })

  useEffect(() => {
    const snapshot = value
    const timeoutId = setTimeout(() => {
      writeVersionedRaw(key, snapshot)
    }, debounceMs)
    return () => clearTimeout(timeoutId)
  }, [key, value, debounceMs])

  useEffect(() => {
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key !== versionedKey(key) || storageEvent.newValue === null) return
      setValue(storageEvent.newValue)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [key])

  const setStringValue = useCallback((next: string | ((previous: string) => string)) => {
    setValue((previous) => (typeof next === "function" ? (next as (previous: string) => string)(previous) : next))
  }, [])

  return [value, setStringValue]
}

export const versionedStorage = {
  key: versionedKey,
  readRaw: readVersionedRaw,
  writeRaw: writeVersionedRaw,
  remove: removeVersioned,
  read: readVersioned,
  write: writeVersioned,
  readString: readVersionedString,
  writeString: writeVersionedString,
}
