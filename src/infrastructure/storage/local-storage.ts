import { _try } from "funcio"
import type { IStorage } from "../../data/protocols/storage"

export class LocalStorageAdapter implements IStorage {
  public get<T>(key: string, fallback: T): T {
    const box = _try.sync(() => {
      if (typeof window === "undefined" || !window.localStorage) return fallback

      const raw = window.localStorage.getItem(key)

      if (raw === null) return fallback

      return JSON.parse(raw) as T
    })

    if (box.isRight()) return box.value as T

    return fallback
  }

  public set<T>(key: string, value: T): void {
    _try.sync(() => {
      if (typeof window === "undefined" || !window.localStorage) return

      window.localStorage.setItem(key, JSON.stringify(value))
    })
  }

  public remove(key: string): void {
    _try.sync(() => {
      if (typeof window === "undefined" || !window.localStorage) return

      window.localStorage.removeItem(key)
    })
  }
}

export const localStorageAdapter = new LocalStorageAdapter()
