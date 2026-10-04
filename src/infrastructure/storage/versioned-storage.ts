import { useCallback, useEffect, useRef, useState } from "react"

const STORAGE_VERSION = "v1" as const
const STORAGE_PREFIX = `reflog:${STORAGE_VERSION}:` as const
const DEBOUNCE_MS = 300 as const

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

export interface PersistentSettingOptions<T> {
  parse: (raw: string) => T
  serialize?: (value: T) => string
  normalize?: (value: T) => T
  apply?: (value: T) => void
}

export function usePersistentSetting<T>(
  key: string,
  fallback: T,
  { parse, serialize = String, normalize, apply }: PersistentSettingOptions<T>,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = readVersionedRaw(key)
    return stored === null ? fallback : normalizeStored(stored, parse, fallback)
  })
  const first = useRef(true)
  const optionsRef = useRef({ parse, serialize, normalize, apply })
  optionsRef.current = { parse, serialize, normalize, apply }

  const set = useCallback((next: T) => {
    const { normalize: normalizeOption } = optionsRef.current
    setValue(normalizeOption ? normalizeOption(next) : next)
  }, [])

  useEffect(() => {
    const write = () => writeVersionedRaw(key, optionsRef.current.serialize(value))
    if (first.current) {
      first.current = false
      write()
      return
    }
    const timer = setTimeout(write, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [key, value])

  useEffect(() => {
    optionsRef.current.apply?.(value)
  }, [value])

  useEffect(() => {
    const storageKey = versionedKey(key)
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key !== storageKey || storageEvent.newValue === null) return
      setValue(normalizeStored(storageEvent.newValue, optionsRef.current.parse, fallback))
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [key, fallback])

  return [value, set]
}

function normalizeStored<T>(raw: string, parse: (raw: string) => T, fallback: T): T {
  try {
    return parse(raw)
  } catch {
    return fallback
  }
}
