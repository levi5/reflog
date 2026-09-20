import { _Either } from "funcio"
import { useCallback } from "react"
import type {
  AutomationAlias,
  AutomationRecipe,
  MonitorAutomation,
} from "../../../domain/entities/automations/automations"
import { expandAlias, resolveVariables, splitArgs, stripGitPrefix, validateAction } from "../../../main/adapters"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { IGitApi } from "../../../infrastructure/git/types"
import type { IStorage } from "../../../data/protocols/storage"
import { useMessage } from "../../context"
import { useAutomationLog } from "./useAutomationLog"
import { useAutomationStore } from "./useAutomationStore"
import { evalCondition } from "./conditionRunner"

interface Deps {
  repoRoot: string
  submodulePaths: string[]
  refreshRepo: () => Promise<void>
  git?: Pick<IGitApi, "run">
  storage?: IStorage
}

export function useAutomations({ repoRoot, submodulePaths, refreshRepo, git = defaultGitApi, storage }: Deps) {
  const {
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
  } = useAutomationStore(storage ? { storage } : undefined)
  const { log, setLog, running, setRunning, clearLog, pushToLog } = useAutomationLog()
  const messageService = useMessage()

  const beginRun = useCallback(
    (label: string) => {
      const loadingId = messageService.loading(label)
      setRunning(true)
      setLog([])
      return loadingId
    },
    [messageService, setLog, setRunning],
  )

  const endRun = useCallback(
    (loadingId: string) => {
      messageService.dismiss(loadingId)
      setRunning(false)
    },
    [messageService, setRunning],
  )

  const resolveTargets = useCallback(
    (target: AutomationRecipe["steps"][number]["run"]["target"], selectedRoot: string): string[] => {
      if (target === "repo") return [selectedRoot]
      if (target === "all-submodules") return submodulePaths.map((p) => `${selectedRoot}/${p}`)
      return [`${selectedRoot}/${target.submodule}`]
    },
    [submodulePaths],
  )

  const runRecipe = useCallback(
    async (recipe: AutomationRecipe, varValues: Record<string, string>): Promise<boolean> => {
      const selectedRoot = recipe.repoPath.trim() || repoRoot
      if (!selectedRoot || running) return false
      const loadingId = beginRun(`Executando "${recipe.name}"...`)
      try {
        for (const step of recipe.steps) {
          const targets = resolveTargets(step.run.target, selectedRoot)
          for (const targetRoot of targets) {
            const thenCmd = resolveVariables(expandAlias(step.run.command, store.aliases), varValues)
            const elseCmd = step.else
              ? resolveVariables(expandAlias(step.else.command, store.aliases), varValues)
              : null
            let takeThen = true
            if (step.when) {
              takeThen = await evalCondition(
                step.when.kind,
                step.when.arg ? resolveVariables(step.when.arg, varValues) : "",
                targetRoot,
                store.aliases,
                git,
              )
            }
            const chosen = takeThen ? thenCmd : elseCmd
            if (!chosen) continue
            const command = stripGitPrefix(chosen)
            const invalid = validateAction(command, store.aliases)
            if (invalid) {
              pushToLog({ target: targetRoot, cmd: command, out: invalid, err: true })
              messageService.error(`Comando inválido na receita "${recipe.name}": ${invalid}`)
              return false
            }

            const gitResult = await _Either.try.async(() => git.run(targetRoot, splitArgs(command)))
            if (gitResult.isLeft()) {
              const e = gitResult.value
              pushToLog({ target: targetRoot, cmd: command, out: String(e), err: true })
              messageService.error(`Falha na receita "${recipe.name}": ${String(e)}`)
              return false
            }

            pushToLog({ target: targetRoot, cmd: command, out: (gitResult.value as string) || "ok", err: false })
          }
        }
        if (selectedRoot === repoRoot) await refreshRepo()
        messageService.success(`"${recipe.name}" concluído com sucesso.`)
        return true
      } finally {
        endRun(loadingId)
      }
    },
    [running, store, repoRoot, refreshRepo, messageService, pushToLog, beginRun, endRun, resolveTargets, git],
  )

  const runMonitor = useCallback(
    async (monitor: MonitorAutomation): Promise<boolean> => {
      const selectedRoot = monitor.repoPath.trim() || repoRoot
      if (!selectedRoot || running) return false
      const loadingId = beginRun(`Executando monitor "${monitor.name}"...`)
      try {
        for (const block of monitor.blocks) {
          for (const cmd of block.commands) {
            const invalid = validateAction(cmd, [])
            if (invalid === "empty") continue
            if (invalid === "unknown-verb") continue
            const args = splitArgs(stripGitPrefix(cmd))
            pushToLog({ target: selectedRoot, cmd: stripGitPrefix(cmd), out: "running...", err: false })

            const gitResult = await _Either.try.async(() => git.run(selectedRoot, args))
            if (gitResult.isLeft()) {
              const e = gitResult.value
              pushToLog({ target: selectedRoot, cmd: stripGitPrefix(cmd), out: String(e), err: true })
              messageService.error(`Falha no monitor "${monitor.name}": ${String(e)}`)
              return false
            }

            pushToLog({
              target: selectedRoot,
              cmd: stripGitPrefix(cmd),
              out: (gitResult.value as string) || "ok",
              err: false,
            })
          }
        }
        messageService.success(`Monitor "${monitor.name}" concluído com sucesso.`)
        return true
      } finally {
        endRun(loadingId)
      }
    },
    [running, repoRoot, messageService, pushToLog, beginRun, endRun, git],
  )

  const runShortcut = useCallback(
    async (shortcut: AutomationAlias, targetPath: string): Promise<boolean> => {
      const target = targetPath.trim() || repoRoot
      if (!target || running) return false
      const command = stripGitPrefix(expandAlias(shortcut.expansion, store.aliases))
      const invalid = validateAction(command, store.aliases)
      if (invalid) {
        setLog([{ target, cmd: command, out: invalid, err: true, at: Date.now() }])
        messageService.error(`Atalho inválido: ${invalid}`)
        return false
      }
      const loadingId = beginRun(`Executando atalho "${shortcut.name}"...`)
      try {
        const gitResult = await _Either.try.async(() => git.run(target, splitArgs(command)))
        if (gitResult.isLeft()) {
          const error = gitResult.value
          setLog([{ target, cmd: command, out: String(error), err: true, at: Date.now() }])
          messageService.error(`Falha no atalho "${shortcut.name}": ${String(error)}`)
          return false
        }

        const out = gitResult.value as string
        setLog([{ target, cmd: command, out: out || "ok", err: false, at: Date.now() }])
        if (target === repoRoot) await refreshRepo()
        messageService.success(`Atalho "${shortcut.name}" executado com sucesso.`)
        return true
      } finally {
        endRun(loadingId)
      }
    },
    [repoRoot, refreshRepo, running, store.aliases, messageService, beginRun, endRun, setLog, git],
  )

  return {
    recipes: store.recipes,
    aliases: store.aliases,
    monitors: store.monitors,
    shortcuts: store.shortcuts,
    running,
    log,
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
    clearLog,
    runRecipe,
    runMonitor,
    runShortcut,
  }
}
