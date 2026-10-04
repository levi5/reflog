import { useCallback, useEffect, useState } from "react"
import type {
  AutomationAlias,
  AutomationRecipe,
  AutomationShortcut,
  AutomationStore,
  MonitorAutomation,
} from "../../../domain/entities/automations/automations"
import {
  loadAutomationStore,
  mergeById,
  mergeByName,
  persistAutomationStore,
} from "../../../data/use-cases/automations/automations-use-case"
import type { IStorage } from "../../../data/protocols/storage"
import { localStorageAdapter } from "../../../infrastructure/storage"
import { removeBy, upsertBy } from "../../../shared/utils/collections"

export const AUTOMATIONS_EVENT = "forgegit.automations.updated"

interface StoreDeps {
  storage?: IStorage
}

export function useAutomationStore({ storage = localStorageAdapter }: StoreDeps = {}) {
  const [store, setStore] = useState<AutomationStore>(() => loadAutomationStore(storage))
  const reloadStore = useCallback(() => setStore(loadAutomationStore(storage)), [storage])

  useEffect(() => {
    const handleSync = () => setStore(loadAutomationStore(storage))
    window.addEventListener(AUTOMATIONS_EVENT, handleSync)
    window.addEventListener("storage", handleSync)
    return () => {
      window.removeEventListener(AUTOMATIONS_EVENT, handleSync)
      window.removeEventListener("storage", handleSync)
    }
  }, [storage])

  const updateStore = useCallback(
    (updater: (prev: AutomationStore) => AutomationStore) => {
      setStore((prev) => {
        const next = updater(prev)
        const success = persistAutomationStore(next, storage)
        if (success) {
          window.dispatchEvent(new CustomEvent(AUTOMATIONS_EVENT))
          return next
        }
        return prev
      })
    },
    [storage],
  )

  const saveRecipe = useCallback(
    (recipe: AutomationRecipe) => {
      updateStore((prev) => ({ ...prev, recipes: upsertBy(prev.recipes, recipe, (entry) => entry.id) }))
    },
    [updateStore],
  )
  const deleteRecipe = useCallback(
    (id: string) => {
      updateStore((prev) => ({
        ...prev,
        recipes: removeBy(prev.recipes, (entry) => entry.id, id),
        shortcuts: prev.shortcuts.filter((entry) => !(entry.targetType === "recipe" && entry.targetId === id)),
      }))
    },
    [updateStore],
  )
  const saveAlias = useCallback(
    (alias: AutomationAlias) => {
      updateStore((prev) => ({ ...prev, aliases: upsertBy(prev.aliases, alias, (entry) => entry.name) }))
    },
    [updateStore],
  )
  const deleteAlias = useCallback(
    (name: string) => {
      updateStore((prev) => ({ ...prev, aliases: removeBy(prev.aliases, (entry) => entry.name, name) }))
    },
    [updateStore],
  )
  const saveMonitor = useCallback(
    (monitor: MonitorAutomation) => {
      updateStore((prev) => ({ ...prev, monitors: upsertBy(prev.monitors, monitor, (entry) => entry.id) }))
    },
    [updateStore],
  )
  const deleteMonitor = useCallback(
    (id: string) => {
      updateStore((prev) => ({
        ...prev,
        monitors: removeBy(prev.monitors, (entry) => entry.id, id),
        shortcuts: prev.shortcuts.filter((entry) => !(entry.targetType === "monitor" && entry.targetId === id)),
      }))
    },
    [updateStore],
  )
  const saveShortcut = useCallback(
    (shortcut: AutomationShortcut) => {
      updateStore((prev) => ({ ...prev, shortcuts: upsertBy(prev.shortcuts, shortcut, (entry) => entry.id) }))
    },
    [updateStore],
  )
  const deleteShortcut = useCallback(
    (id: string) => {
      updateStore((prev) => ({ ...prev, shortcuts: removeBy(prev.shortcuts, (entry) => entry.id, id) }))
    },
    [updateStore],
  )
  const importAutomations = useCallback(
    (imported: {
      recipes?: AutomationRecipe[]
      aliases?: AutomationAlias[]
      monitors?: MonitorAutomation[]
      shortcuts?: AutomationShortcut[]
    }) => {
      updateStore((prev) => ({
        recipes: imported.recipes?.length ? mergeById(prev.recipes, imported.recipes) : prev.recipes,
        aliases: imported.aliases?.length ? mergeByName(prev.aliases, imported.aliases) : prev.aliases,
        monitors: imported.monitors?.length ? mergeById(prev.monitors, imported.monitors) : prev.monitors,
        shortcuts: imported.shortcuts?.length ? mergeById(prev.shortcuts, imported.shortcuts) : prev.shortcuts,
      }))
    },
    [updateStore],
  )

  return {
    store,
    reloadStore,
    saveRecipe,
    deleteRecipe,
    saveAlias,
    deleteAlias,
    saveMonitor,
    deleteMonitor,
    saveShortcut,
    deleteShortcut,
    importAutomations,
  }
}
