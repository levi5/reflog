import { isTauri } from "@tauri-apps/api/core"
import { emitTo, listen } from "@tauri-apps/api/event"
import { useEffect, useRef } from "react"
import { gitApi } from "../../../infrastructure/git"
import { useRepo, useTranslation } from "../../context"
import type { FloatingReply, FloatingRequest, FloatingSnapshot } from "./bridge"

export function useFloatingBridge() {
  const repo = useRepo()
  const { t } = useTranslation()
  const latest = useRef({ repo, t })
  latest.current = { repo, t }
  const working = useRef(false)

  useEffect(() => {
    if (!isTauri()) return
    let disposed = false
    const subscription = listen<FloatingRequest>("floating-request", async ({ payload: request }) => {
      if (disposed || !request?.id || !request.operation) return
      const { repo: current, t: translate } = latest.current
      const { operation, repoPath } = request
      let data: unknown
      let error: string | undefined
      let acquired = false
      try {
        if (operation.kind === "snapshot") {
          const path = current.repo
          const [status, branches, stashes] = path
            ? await Promise.all([gitApi.status(path), gitApi.branches(path), gitApi.stashList(path)])
            : [null, [], []]
          if (latest.current.repo.repo !== path) throw new Error(translate("floatingRepoChanged"))
          data = {
            repoPath: path,
            status,
            branches,
            stashes,
            busy: latest.current.repo.busy || working.current,
          } satisfies FloatingSnapshot
        } else if (operation.kind === "open-repo") {
          if (current.busy || current.opening || working.current) throw new Error(translate("floatingBusy"))
          working.current = true
          acquired = true
          if (!operation.path.trim() || !(await current.handleOpen(operation.path))) {
            throw new Error(translate("floatingInvalidRepo"))
          }
          data = { opened: true }
        } else {
          if (!repoPath || repoPath !== current.repo || current.opening)
            throw new Error(translate("floatingRepoChanged"))
          if (current.busy || working.current) throw new Error(translate("floatingBusy"))
          if (operation.kind === "diff") {
            data =
              operation.file.y === "?"
                ? (await gitApi.fileContent(repoPath, operation.file.path)).slice(0, 80_000)
                : (await gitApi.diff(repoPath, operation.file.path, operation.file.staged)).slice(0, 80_000)
          } else if (operation.kind === "stash-diff") {
            const stash = (await gitApi.stashList(repoPath)).find(
              (item) => item.index === operation.index && item.hash === operation.hash,
            )
            if (!stash) throw new Error(translate("floatingRepoChanged"))
            data = (await gitApi.stashShow(repoPath, operation.index)).slice(0, 80_000)
          } else {
            working.current = true
            acquired = true
            let failure: unknown
            await current.runAction(async () => {
              try {
                if (latest.current.repo.repo !== repoPath) throw new Error(translate("floatingRepoChanged"))
                switch (operation.kind) {
                  case "stage":
                    if (!operation.paths.length) throw new Error(translate("floatingSelectFiles"))
                    data = await gitApi.add(repoPath, operation.paths)
                    break
                  case "unstage":
                    for (const path of operation.paths) await gitApi.unstage(repoPath, path)
                    break
                  case "commit": {
                    const status = await gitApi.status(repoPath)
                    const paths = status.files
                      .filter((file) => file.staged)
                      .map((file) => file.path)
                      .sort()
                    if (
                      !operation.message.trim() ||
                      !paths.length ||
                      status.files.some((file) => file.unmerged) ||
                      status.merging ||
                      status.rebasing ||
                      status.cherryPicking ||
                      status.reverting
                    ) {
                      throw new Error(translate("floatingCommitBlocked"))
                    }
                    if (
                      status.head !== operation.head ||
                      status.branch !== operation.branch ||
                      JSON.stringify(paths) !== JSON.stringify([...operation.stagedPaths].sort())
                    ) {
                      throw new Error(translate("floatingReviewChanged"))
                    }
                    data = await gitApi.commit(repoPath, operation.message.trim())
                    break
                  }
                  case "merge": {
                    const status = await gitApi.status(repoPath)
                    if (status.head !== operation.head || status.branch !== operation.target) {
                      throw new Error(translate("floatingReviewChanged"))
                    }
                    if (
                      status.files.length ||
                      status.merging ||
                      status.rebasing ||
                      status.cherryPicking ||
                      status.reverting
                    ) {
                      throw new Error(translate("floatingMergeBlocked"))
                    }
                    const branches = await gitApi.branches(repoPath)
                    if (!branches.some((branch) => branch.name === operation.branch && !branch.current)) {
                      throw new Error(translate("floatingRepoChanged"))
                    }
                    data = await gitApi.mergeOpts(repoPath, operation.branch, operation.squash, operation.noFf)
                    break
                  }
                  case "stash": {
                    const status = await gitApi.status(repoPath)
                    if (
                      status.files.some((file) => file.unmerged) ||
                      status.merging ||
                      status.rebasing ||
                      status.cherryPicking ||
                      status.reverting
                    ) {
                      throw new Error(translate("floatingOperationInProgress"))
                    }
                    data = await gitApi.stash(repoPath, operation.message.trim() || undefined)
                    break
                  }
                  case "stash-apply": {
                    const status = await gitApi.status(repoPath)
                    if (
                      status.files.length ||
                      status.merging ||
                      status.rebasing ||
                      status.cherryPicking ||
                      status.reverting
                    ) {
                      throw new Error(translate("floatingMergeBlocked"))
                    }
                    const stash = (await gitApi.stashList(repoPath)).find(
                      (item) => item.index === operation.index && item.hash === operation.hash,
                    )
                    if (!stash) throw new Error(translate("floatingRepoChanged"))
                    data = await gitApi.stashApply(repoPath, operation.index)
                    break
                  }
                }
                return data
              } catch (e) {
                failure = e
                throw e
              }
            })
            if (failure) {
              if (latest.current.repo.repo === repoPath) await current.refresh(repoPath).catch(console.error)
              throw failure
            }
          }
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e)
      } finally {
        if (acquired) working.current = false
      }
      if (!disposed)
        await emitTo("floating", "floating-reply", { id: request.id, data, error } satisfies FloatingReply).catch(
          console.error,
        )
    })
    return () => {
      disposed = true
      void subscription.then((stop) => stop()).catch(console.error)
    }
  }, [])
}
