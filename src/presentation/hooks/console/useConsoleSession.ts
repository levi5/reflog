import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  diffGraphs,
  intentOf,
  isDangerousCmd,
  splitArgs,
  splitChain,
  spotlightForCommand,
  stripGitPrefix,
  suggestCommands,
} from "../../../main/adapters"
import type { ConsoleLine, Intent } from "../../../domain/entities/git/git-console"
import type { GraphChange } from "../../../domain/entities/graph/graph-anim"
import { t } from "../../../i18n"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { IGitApi } from "../../../infrastructure/git/types"
import { EMPTY_OUTPUT_PLACEHOLDER, FRESH_TTL_MS, NO_ACTIVE_SUGGESTION } from "../../../shared/constants/limits"
import type { CommitInfo, Lang } from "../../../types"
import type { ConsoleMode, ConsoleSession } from "../../../types/components/console"
import { useMessage } from "../../context"
import type { Repository } from "../repository/useRepository"
import { appendConsoleLine, buildConsoleLine, isReadOnlyCommand, recordCommandHistory } from "./consoleHistory"

interface UseConsoleSessionOptions {
  language: Lang
  repo: Repository
  git?: Pick<IGitApi, "run" | "graph">
}

export function useConsoleSession({ language, repo, git = defaultGitApi }: UseConsoleSessionOptions): ConsoleSession {
  const messageService = useMessage()
  const [mode, setMode] = useState<ConsoleMode>("term")
  const [history, setHistory] = useState<string[]>([])
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [changes, setChanges] = useState<GraphChange[]>([])
  const [freshHashes, setFreshHashes] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [pendingCommand, setPendingCommand] = useState<string | null>(null)
  const [command, setCommand] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_SUGGESTION)
  const freshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (freshTimerRef.current) clearTimeout(freshTimerRef.current)
    }
  }, [])

  const scheduleFreshClear = useCallback((hashes: string[]) => {
    if (freshTimerRef.current) clearTimeout(freshTimerRef.current)
    setFreshHashes(hashes)
    if (hashes.length > 0) {
      freshTimerRef.current = setTimeout(() => {
        setFreshHashes([])
      }, FRESH_TTL_MS)
    }
  }, [])

  const resetOutputs = () => {
    if (freshTimerRef.current) clearTimeout(freshTimerRef.current)
    setLines([])
    setChanges([])
    setFreshHashes([])
  }

  const appendOutput = (commandText: string, output: string, isError: boolean) => {
    setLines((previousLines) => appendConsoleLine(previousLines, buildConsoleLine(commandText, output, isError)))
  }

  const applySpotlight = (verb: string, output: string) => {
    const spotlight = spotlightForCommand(verb, output, repo.graph)
    if (!spotlight) return
    setChanges(spotlight.changes)
    scheduleFreshClear(spotlight.fresh)
  }

  const applyGraphDiff = useCallback(
    async (graphBefore: CommitInfo[]) => {
      try {
        const graphAfter = await git.graph(repo.repo)
        const graphDiff = diffGraphs(graphBefore, graphAfter)
        setChanges(graphDiff.changes)
        scheduleFreshClear(graphDiff.fresh)
      } catch (graphError) {
        messageService.error(String(graphError))
      }
    },
    [git, repo.repo, scheduleFreshClear, messageService],
  )

  const runCommand = async (rawCommand: string) => {
    const commandText = stripGitPrefix(rawCommand)
    if (!commandText || !repo.repo) return

    const steps = splitChain(commandText)
    if (steps.length > 1) {
      await runChain(steps)
      return
    }

    const args = splitArgs(commandText)
    if (args.length === 0) return
    const verb = args[0] ?? ""

    if (verb === "clear") {
      resetOutputs()
      return
    }
    if (verb === "help") {
      appendOutput(commandText, t(language, "helpBody"), false)
      return
    }

    const graphBefore = repo.graph
    setChanges([])
    setFreshHashes([])
    setHistory((previousHistory) => recordCommandHistory(previousHistory, commandText))
    setRunning(true)

    const loadingId = messageService.loading(`${t(language, "consoleRunning")} git ${commandText}...`)
    try {
      const output = await git.run(repo.repo, args)
      appendOutput(commandText, output || EMPTY_OUTPUT_PLACEHOLDER, false)
      messageService.dismiss(loadingId)
      messageService.success(`git ${commandText} ${t(language, "consoleDone")}`)

      if (isReadOnlyCommand(args)) {
        applySpotlight(verb, output)
        return
      }
      await repo.refresh(repo.repo)
      await applyGraphDiff(graphBefore)
    } catch (commandError) {
      messageService.dismiss(loadingId)
      messageService.error(String(commandError))
      appendOutput(commandText, String(commandError), true)
    } finally {
      messageService.dismiss(loadingId)
      setRunning(false)
    }
  }

  const executeStep = async (stepText: string): Promise<boolean> => {
    const step = stripGitPrefix(stepText)
    const args = splitArgs(step)
    if (args.length === 0) return true
    try {
      const output = await git.run(repo.repo, args)
      appendOutput(step, output || EMPTY_OUTPUT_PLACEHOLDER, false)
      return true
    } catch (stepError) {
      const errorText = String(stepError)
      appendOutput(step, errorText, true)
      messageService.error(errorText || t(language, "actionFailed"))
      return false
    }
  }

  const runChain = async (steps: string[]) => {
    if (!repo.repo) return
    const chained = steps.join(" && ")
    const graphBefore = repo.graph
    setChanges([])
    setFreshHashes([])
    setHistory((previousHistory) => recordCommandHistory(previousHistory, chained))
    setRunning(true)

    const loadingId = messageService.loading(`${t(language, "consoleRunning")} git ${chained}...`)
    try {
      for (const step of steps) {
        const ok = await executeStep(step)
        if (!ok) return
      }
      messageService.dismiss(loadingId)
      messageService.success(`git ${chained} ${t(language, "consoleDone")}`)
      await repo.refresh(repo.repo)
      await applyGraphDiff(graphBefore)
    } catch (commandError) {
      messageService.dismiss(loadingId)
      messageService.error(String(commandError))
    } finally {
      messageService.dismiss(loadingId)
      setRunning(false)
    }
  }

  const requestRun = (rawCommand: string) => {
    const commandText = stripGitPrefix(rawCommand)
    if (!commandText) return
    if (splitChain(commandText).some((step) => isDangerousCmd(stripGitPrefix(step)))) {
      setPendingCommand(commandText)
      return
    }
    void runCommand(rawCommand)
  }

  const clearInputAndRun = (commandToRun: string) => {
    setCommand("")
    setIsFocused(false)
    requestRun(commandToRun)
  }

  const chooseSuggestion = (suggestion: string) => {
    if (suggestion.endsWith(" ")) {
      setCommand(suggestion)
      setActiveIndex(NO_ACTIVE_SUGGESTION)
      return
    }
    clearInputAndRun(suggestion)
  }

  const suggestionItems = useMemo(() => suggestCommands(command, history), [command, history])
  const currentIndex = Math.min(activeIndex, suggestionItems.length - 1)
  const currentItem: string | undefined = suggestionItems[currentIndex]

  const intent: Intent | null = intentOf(command)

  const keyHandlers: Record<string, () => void> = {
    ArrowDown: () => {
      setIsFocused(true)
      setActiveIndex((previousIndex) => Math.min(previousIndex + 1, suggestionItems.length - 1))
    },
    ArrowUp: () => {
      setActiveIndex((previousIndex) => (previousIndex <= 0 ? suggestionItems.length - 1 : previousIndex - 1))
    },
    Enter: () => {
      if (currentItem) chooseSuggestion(currentItem)
      else clearInputAndRun(command)
    },
    Tab: () => {
      if (!currentItem) return
      setCommand(currentItem)
      setActiveIndex(NO_ACTIVE_SUGGESTION)
    },
    Escape: () => {
      setIsFocused(false)
      setActiveIndex(NO_ACTIVE_SUGGESTION)
    },
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const handler = keyHandlers[event.key]
    if (!handler) return
    if (event.key === "Tab" && !currentItem) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Tab") {
      event.preventDefault()
    }
    handler()
    if (event.key === "Escape") event.currentTarget.blur()
  }

  const handleChange = (nextCommand: string) => {
    setCommand(nextCommand)
    setActiveIndex(NO_ACTIVE_SUGGESTION)
    setIsFocused(true)
  }

  return {
    mode,
    command,
    lines,
    changes,
    freshHashes,
    running,
    intent,
    suggestions: {
      items: suggestionItems,
      activeIndex: currentIndex,
      isOpen: isFocused && suggestionItems.length > 0 && !running,
      onChoose: chooseSuggestion,
    },
    pendingCommand,
    onModeChange: setMode,
    onCommandChange: handleChange,
    onCommandFocus: () => setIsFocused(true),
    onCommandBlur: () => setIsFocused(false),
    onCommandKeyDown: handleKeyDown,
    onRequestRun: requestRun,
    onClear: resetOutputs,
    onCancelPendingCommand: () => setPendingCommand(null),
    onConfirmPendingCommand: () => {
      if (!pendingCommand) return
      const commandToRun = pendingCommand
      setPendingCommand(null)
      void runCommand(commandToRun)
    },
  }
}
