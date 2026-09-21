import type { IGitApi } from "../../../infrastructure/git/types"
import type { Lang } from "../../../types"

export interface UndoAction {
  label: string
  onAction: () => void
}

export interface RunActionOptions {
  loadingMessage?: string
  successMessage?: string
  errorMessage?: string
  title?: string
  successDuration?: number
  successAction?: UndoAction
}

export type RunAction = (work: () => Promise<unknown>, after?: () => void, options?: RunActionOptions) => Promise<void>

export interface RepositoryActionDeps {
  lang: Lang
  repo: string
  runAction: RunAction
  requestConfirm: (title: string, message: string) => Promise<boolean>
  git?: IGitApi
}
