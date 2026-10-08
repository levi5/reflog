import { open } from "@tauri-apps/plugin-dialog"
import { useCallback } from "react"
import { t } from "../../../i18n"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"
import type { IGitApi } from "../../../infrastructure/git/types"
import type { Lang } from "../../../types"
import type { MessageActions } from "../../context/message/message-context"

interface RepoOpenerDeps {
  lang: Lang
  git?: IGitApi
  repoInput: string
  opening: boolean
  setRepoInput: (value: string) => void
  setRepo: (value: string) => void
  setMsg: (message: string) => void
  setBusy: (busy: boolean) => void
  setOpening: (opening: boolean) => void
  pushRecent: (root: string) => void
  fail: (error: unknown, message?: string) => void
  messageService: MessageActions
}

export function useRepoOpener({
  lang,
  git = defaultGitApi,
  repoInput,
  opening,
  setRepoInput,
  setRepo,
  setMsg,
  setBusy,
  setOpening,
  pushRecent,
  fail,
  messageService,
}: RepoOpenerDeps) {
  const pickDirectory = useCallback(async (): Promise<string | null> => {
    try {
      const selected = await open({ directory: true, multiple: false })
      return typeof selected === "string" ? selected : null
    } catch {
      return null
    }
  }, [])

  const finishOpenRepo = useCallback(
    (root: string) => {
      setRepo(root)
      setRepoInput(root)
      pushRecent(root)
    },
    [setRepo, setRepoInput, pushRecent],
  )

  const handleOpen = useCallback(
    async (path?: string) => {
      const target = (path ?? repoInput).trim()
      if (!target || opening) return false
      setOpening(true)
      setMsg("")
      const loadingId = messageService.loading(t(lang, "openingRepo"))
      try {
        const ok = await git.checkRepo(target)
        if (!ok) {
          messageService.dismiss(loadingId)
          const notRepoMsg = t(lang, "noRepo")
          setMsg(notRepoMsg)
          messageService.error(notRepoMsg)
          return false
        }
        finishOpenRepo(await git.repoRoot(target))
        messageService.dismiss(loadingId)
        messageService.success(t(lang, "openedRepo"))
        return true
      } catch (error: unknown) {
        messageService.dismiss(loadingId)
        fail(error, t(lang, "actionFailed"))
        return false
      } finally {
        setOpening(false)
      }
    },
    [git, repoInput, opening, lang, messageService, fail, finishOpenRepo, setOpening, setMsg],
  )

  const handleBrowse = useCallback(async () => {
    try {
      const selected = await pickDirectory()
      if (!selected) return false
      setRepoInput(selected)
      return await handleOpen(selected)
    } catch {
      return false
    }
  }, [pickDirectory, setRepoInput, handleOpen])

  const cloneRepo = useCallback(
    (url: string, dir: string, options?: { depth?: number; branch?: string; recurseSubmodules?: boolean }) => {
      const trimmedUrl = url.trim()
      const trimmedDir = dir.trim()
      if (!trimmedUrl || !trimmedDir || opening) return Promise.resolve(false)
      const depth = options?.depth
      if (depth !== undefined && (!Number.isInteger(depth) || depth <= 0)) {
        fail(new Error(t(lang, "cloneDepthInvalid")), t(lang, "actionFailed"))
        return Promise.resolve(false)
      }
      setOpening(true)
      setBusy(true)
      const loadingId = messageService.loading(t(lang, "cloningRepo"))
      return git
        .clone(trimmedUrl, trimmedDir, {
          depth,
          branch: options?.branch?.trim() || undefined,
          recurseSubmodules: options?.recurseSubmodules,
        })
        .then((message) => {
          const text = message.trim() || t(lang, "clonedRepo")
          setMsg(text)
          return git.repoRoot(trimmedDir)
        })
        .then((root) => {
          finishOpenRepo(root)
          messageService.dismiss(loadingId)
          messageService.success(t(lang, "clonedRepo"))
          return true
        })
        .catch((error: unknown) => {
          messageService.dismiss(loadingId)
          fail(error, t(lang, "actionFailed"))
          return false
        })
        .finally(() => {
          setBusy(false)
          setOpening(false)
        })
    },
    [git, opening, lang, messageService, fail, finishOpenRepo, setBusy, setOpening, setMsg],
  )

  const initRepo = useCallback(
    (path: string) => {
      const target = path.trim()
      if (!target || opening) return Promise.resolve(false)
      setOpening(true)
      setBusy(true)
      setMsg("")
      const loadingId = messageService.loading(t(lang, "initializingRepo"))
      return git
        .init(target)
        .then(() => git.repoRoot(target))
        .then((root) => {
          finishOpenRepo(root)
          messageService.dismiss(loadingId)
          messageService.success(t(lang, "initializedRepo"))
          return true
        })
        .catch((error: unknown) => {
          messageService.dismiss(loadingId)
          fail(error, t(lang, "actionFailed"))
          return false
        })
        .finally(() => {
          setBusy(false)
          setOpening(false)
        })
    },
    [git, opening, lang, messageService, fail, finishOpenRepo, setBusy, setOpening, setMsg],
  )

  return { handleOpen, handleBrowse, pickDir: pickDirectory, cloneRepo, initRepo }
}
