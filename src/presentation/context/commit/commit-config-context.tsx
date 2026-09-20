import { createContext, type ReactNode, useCallback, useContext, useState } from "react"
import type { CommitPrefs, CommitPreset } from "../../../domain/entities/commit/commit-template"
import {
  clearHistory as clearHistoryUseCase,
  loadHistory,
  loadPrefs,
  loadPresets,
  pushHistory as pushHistoryUseCase,
  savePrefs as savePrefsUseCase,
  savePresets as savePresetsUseCase,
} from "../../../main/adapters"

export interface CommitConfigContextValue {
  prefs: CommitPrefs
  presets: CommitPreset[]
  history: string[]
  savePrefs: (prefs: CommitPrefs) => void
  savePresets: (presets: CommitPreset[]) => void
  pushHistory: (msg: string) => string[]
  clearHistory: () => void
}

export const CommitConfigContext = createContext<CommitConfigContextValue | null>(null)

export function CommitConfigProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<CommitPrefs>(loadPrefs)
  const [presets, setPresets] = useState<CommitPreset[]>(loadPresets)
  const [history, setHistory] = useState<string[]>(loadHistory)

  const savePrefs = useCallback((nextPrefs: CommitPrefs) => {
    savePrefsUseCase(nextPrefs)
    setPrefs(nextPrefs)
  }, [])

  const savePresets = useCallback((nextPresets: CommitPreset[]) => {
    savePresetsUseCase(nextPresets)
    setPresets(nextPresets)
  }, [])

  const pushHistory = useCallback((msg: string) => {
    const updated = pushHistoryUseCase(msg)
    setHistory(updated)
    return updated
  }, [])

  const clearHistory = useCallback(() => {
    clearHistoryUseCase()
    setHistory([])
  }, [])

  return (
    <CommitConfigContext.Provider
      value={{
        prefs,
        presets,
        history,
        savePrefs,
        savePresets,
        pushHistory,
        clearHistory,
      }}
    >
      {children}
    </CommitConfigContext.Provider>
  )
}

export function useCommitConfig(): CommitConfigContextValue {
  const ctx = useContext(CommitConfigContext)
  if (!ctx) {
    throw new Error("useCommitConfig must be used within CommitConfigProvider")
  }
  return ctx
}
