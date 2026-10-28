import { emitTo, listen } from "@tauri-apps/api/event"
import type { BranchInfo, FileStatus, StashItem, StatusResult } from "../../../types"
import { detectLocale, t } from "../../../i18n"

export interface FloatingSnapshot {
  repoPath: string
  busy: boolean
  status: StatusResult | null
  branches: BranchInfo[]
  stashes: StashItem[]
}

export type FloatingOperation =
  | { kind: "snapshot" }
  | { kind: "open-repo"; path: string }
  | { kind: "stage" | "unstage"; paths: string[] }
  | { kind: "commit"; message: string; stagedPaths: string[]; head: string; branch: string }
  | { kind: "merge"; branch: string; target: string; head: string; squash: boolean; noFf: boolean }
  | { kind: "stash"; message: string }
  | { kind: "stash-apply" | "stash-diff"; index: number; hash: string }
  | { kind: "diff"; file: FileStatus }

export interface FloatingRequest {
  id: string
  repoPath: string
  operation: FloatingOperation
}

export interface FloatingReply {
  id: string
  data?: unknown
  error?: string
}

// Listen before sending: replies can arrive immediately, including "no repository".
export async function requestFloating<T>(operation: FloatingOperation, repoPath = ""): Promise<T> {
  const id = crypto.randomUUID()
  return new Promise<T>((resolve, reject) => {
    let stop: (() => void) | undefined
    let settled = false
    const readOnly = operation.kind === "snapshot" || operation.kind === "diff" || operation.kind === "stash-diff"
    const timer = setTimeout(
      () => {
        settled = true
        stop?.()
        reject(new Error(t(detectLocale(), "floatingNoResponse")))
      },
      readOnly ? 15_000 : 120_000,
    )
    const fail = (error: unknown) => {
      settled = true
      clearTimeout(timer)
      stop?.()
      reject(error)
    }
    void listen<FloatingReply>("floating-reply", ({ payload }) => {
      if (payload.id !== id) return
      settled = true
      clearTimeout(timer)
      stop?.()
      if (payload.error) reject(new Error(payload.error))
      else resolve(payload.data as T)
    })
      .then((unlisten) => {
        stop = unlisten
        if (settled) {
          stop()
          return
        }
        return emitTo("main", "floating-request", { id, repoPath, operation } satisfies FloatingRequest)
      })
      .catch(fail)
  })
}
