import { automationsUseCase, gitCommandParserUseCase } from "../../../data"
import { _Either } from "funcio"
import { useCallback } from "react"
import type {
  AutomationAlias,
  AutomationRecipe,
  MonitorAutomation,
} from "../../../domain/entities/automations/automations"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { IGitApi } from "../../../infrastructure/git/types"
import type { IStorage } from "../../../data/protocols/storage"
import { useMessageActions } from "../../context"
import { useTranslation } from "../../context/translation/translation-context"
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
  const messageService = useMessageActions()
  const { format } = useTranslation()

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
      if (target === "all-submodules") return submodulePaths.map((submodulePath) => `${selectedRoot}/${submodulePath}`)
      return [`${selectedRoot}/${target.submodule}`]
    },
    [submodulePaths],
  )

  const runRecipe = useCallback(
    async (recipe: AutomationRecipe, varValues: Record<string, string>): Promise<boolean> => {
      const selectedRoot = recipe.repoPath.trim() || repoRoot
      if (!selectedRoot || running) return false
      const loadingId = beginRun(format("executingRecipe", { name: recipe.name }))
      try {
        for (const step of recipe.steps) {
          const targets = resolveTargets(step.run.target, selectedRoot)
          for (const targetRoot of targets) {
            const thenCmd = automationsUseCase.resolveVariables(
              automationsUseCase.expandAlias(step.run.command, store.aliases),
              varValues,
            )
            const elseCmd = step.else
              ? automationsUseCase.resolveVariables(
                  automationsUseCase.expandAlias(step.else.command, store.aliases),
                  varValues,
                )
              : null
            let takeThen = true
            if (step.when) {
              takeThen = await evalCondition(
                step.when.kind,
                step.when.arg ? automationsUseCase.resolveVariables(step.when.arg, varValues) : "",
                targetRoot,
                store.aliases,
                git,
              )
            }
            const chosen = takeThen ? thenCmd : elseCmd
            if (!chosen) continue
            const command = gitCommandParserUseCase.stripGitPrefix(chosen)
            const invalid = automationsUseCase.validateAction(command, store.aliases)
            if (invalid) {
              pushToLog({ target: targetRoot, cmd: command, out: invalid, err: true })
              messageService.error(format("automationInvalidCommandInRecipe", { name: recipe.name, detail: invalid }))
              return false
            }

            const gitResult = await _Either.try.async(() =>
              git.run(targetRoot, gitCommandParserUseCase.splitArgs(command)),
            )
            if (gitResult.isLeft()) {
              const failure = gitResult.value
              pushToLog({ target: targetRoot, cmd: command, out: String(failure), err: true })
              messageService.error(format("automationRecipeFailed", { name: recipe.name, detail: String(failure) }))
              return false
            }

            pushToLog({ target: targetRoot, cmd: command, out: (gitResult.value as string) || "ok", err: false })
          }
        }
        if (selectedRoot === repoRoot) await refreshRepo()
        messageService.success(format("automationRecipeDone", { name: recipe.name }))
        return true
      } finally {
        endRun(loadingId)
      }
    },
    [running, store, repoRoot, refreshRepo, messageService, pushToLog, beginRun, endRun, resolveTargets, git, format],
  )

  const runMonitor = useCallback(
    async (monitor: MonitorAutomation): Promise<boolean> => {
      const selectedRoot = monitor.repoPath.trim() || repoRoot
      if (!selectedRoot || running) return false
      const loadingId = beginRun(format("executingMonitor", { name: monitor.name }))
      try {
        for (const block of monitor.blocks) {
          for (const cmd of block.commands) {
            const invalid = automationsUseCase.validateAction(cmd, [])
            if (invalid === "empty") continue
            if (invalid === "unknown-verb") continue
            const args = gitCommandParserUseCase.splitArgs(gitCommandParserUseCase.stripGitPrefix(cmd))
            pushToLog({
              target: selectedRoot,
              cmd: gitCommandParserUseCase.stripGitPrefix(cmd),
              out: "running...",
              err: false,
            })

            const gitResult = await _Either.try.async(() => git.run(selectedRoot, args))
            if (gitResult.isLeft()) {
              const failure = gitResult.value
              pushToLog({
                target: selectedRoot,
                cmd: gitCommandParserUseCase.stripGitPrefix(cmd),
                out: String(failure),
                err: true,
              })
              messageService.error(format("automationMonitorFailed", { name: monitor.name, detail: String(failure) }))
              return false
            }

            pushToLog({
              target: selectedRoot,
              cmd: gitCommandParserUseCase.stripGitPrefix(cmd),
              out: (gitResult.value as string) || "ok",
              err: false,
            })
          }
        }
        messageService.success(format("automationMonitorDone", { name: monitor.name }))
        return true
      } finally {
        endRun(loadingId)
      }
    },
    [running, repoRoot, messageService, pushToLog, beginRun, endRun, git, format],
  )

  const runShortcut = useCallback(
    async (shortcut: AutomationAlias, targetPath: string): Promise<boolean> => {
      const target = targetPath.trim() || repoRoot
      if (!target || running) return false
      const command = gitCommandParserUseCase.stripGitPrefix(
        automationsUseCase.expandAlias(shortcut.expansion, store.aliases),
      )
      const invalid = automationsUseCase.validateAction(command, store.aliases)
      if (invalid) {
        setLog([{ target, cmd: command, out: invalid, err: true, at: Date.now() }])
        messageService.error(format("automationShortcutInvalid", { detail: invalid }))
        return false
      }
      const loadingId = beginRun(format("automationShortcutRunning", { name: shortcut.name }))
      try {
        const gitResult = await _Either.try.async(() => git.run(target, gitCommandParserUseCase.splitArgs(command)))
        if (gitResult.isLeft()) {
          const error = gitResult.value
          setLog([{ target, cmd: command, out: String(error), err: true, at: Date.now() }])
          messageService.error(format("automationShortcutFailed", { name: shortcut.name, detail: String(error) }))
          return false
        }

        const out = gitResult.value as string
        setLog([{ target, cmd: command, out: out || "ok", err: false, at: Date.now() }])
        if (target === repoRoot) await refreshRepo()
        messageService.success(format("automationShortcutDone", { name: shortcut.name }))
        return true
      } finally {
        endRun(loadingId)
      }
    },
    [repoRoot, refreshRepo, running, store.aliases, messageService, beginRun, endRun, setLog, git, format],
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
