import { codeHighlightUseCase } from "../../../data"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import { useSearchParams } from "react-router-dom"

import { SearchBox } from "../../components/Search"
import { Status } from "../../components/Status"
import { Editor } from "../../components/Editor"
import { Commit } from "../../components/Commit"
import { Modal } from "../../components/Modal"
import { Resizable } from "@/presentation/components/Resizable"
import { Skeleton } from "../../components/Skeleton"
import { useVirtualRows } from "../../hooks/ui/useVirtualRows"

import { useRepo, useSearch, useSettingsContext } from "../../context"
import { t } from "../../../i18n"
import type { CommitInfo, FileStatus } from "../../../types"

import styles from "./style.module.scss"

type Props = Record<string, never>

const TRACKED_FILE_LIMIT = 400

export const Blame = (_props: Props) => {
  const { lang } = useSettingsContext()
  const repo = useRepo()
  const { query, scope } = useSearch()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)
  const fileParam = searchParams.get("file")
  const repoPath = repo.repo
  const blameFile = repo.blameFile
  const loadBlame = repo.loadBlame
  const loadTracked = repo.loadTracked

  useEffect(() => {
    if (repoPath) void loadTracked()
  }, [repoPath, loadTracked])

  useEffect(() => {
    if (fileParam && repoPath && fileParam !== blameFile && !repo.blameLoading) {
      void loadBlame(fileParam)
    }
  }, [fileParam, repoPath, blameFile, repo.blameLoading, loadBlame])

  const handleSelectFile = useCallback(
    (filePath: string) => {
      setSearchParams((prev) => {
        const nextSearchParams = new URLSearchParams(prev)
        nextSearchParams.set("file", filePath)
        return nextSearchParams
      })
      void loadBlame(filePath)
    },
    [setSearchParams, loadBlame],
  )

  const matchedFiles = useMemo(() => {
    const name = scope === "commits" || scope === "branches" ? "" : query.trim().toLowerCase()
    return repo.trackedFiles.filter((file: string) => !name || file.toLowerCase().includes(name))
  }, [repo.trackedFiles, query, scope])

  const files: FileStatus[] = useMemo(
    () =>
      matchedFiles.slice(0, TRACKED_FILE_LIMIT).map((path: string) => ({
        path,
        x: "",
        y: "",
        staged: false,
        unmerged: false,
      })),
    [matchedFiles],
  )

  const codeNodes = useMemo(
    (): ReactNode[] =>
      repo.blameLines.map((line: (typeof repo.blameLines)[0]) => {
        if (line.text === "") return " "

        const tree = codeHighlightUseCase.highlightLineHast(line.text, repo.blameFile)

        if (!tree) return line.text
        return toJsxRuntime(tree, { Fragment, jsx, jsxs })
      }),
    [repo.blameLines, repo.blameFile],
  )

  const blameRows = useVirtualRows({
    count: repo.blameLines.length,
    estimate: 22,
    overscan: 24,
    enabled: repo.blameLines.length > 200,
  })

  const truncated = matchedFiles.length > TRACKED_FILE_LIMIT

  return (
    <Resizable.Layout
      sidebarWidth={{ initial: 300, min: 220, max: 560, storageKey: "blame.side", label: t(lang, "resizeSidebar") }}
      sidebar={
        <Fragment>
          <div className={styles.sideHead}>
            <strong>{t(lang, "blame").toUpperCase()}</strong>
            <span className={styles.pct}>{repo.trackedFiles.length}</span>
          </div>
          <SearchBox placeholder={t(lang, "searchFiles")} />
          <Status.File files={files} selectedFilePath={repo.blameFile} detailed={false} onSelect={handleSelectFile} />
          {truncated && (
            <p className={styles.truncated}>
              {t(lang, "blameTruncated")
                .replace("{shown}", String(TRACKED_FILE_LIMIT))
                .replace("{total}", String(matchedFiles.length))}
            </p>
          )}
        </Fragment>
      }
      main={
        <div className={styles.wrapperMain}>
          <div className={styles.wrapperFile}>
            <div className={styles.mainHead}>
              <h3>{repo.blameFile || t(lang, "treeBlame")}</h3>
              {repo.blameFile && (
                <button type="button" className="mini-btn" onClick={() => repo.openEditor(repo.blameFile)}>
                  {t(lang, "editFile")}
                </button>
              )}
            </div>
            {repo.blameLoading && (
              <Skeleton.Lines count={18} label={t(lang, "blameLoading")} className={styles.skeleton} />
            )}
            {!repo.blameLoading && repo.blameError !== null && (
              <p className={styles.error} role="alert">
                {t(lang, "blameFailed")}
              </p>
            )}
            {!repo.blameLoading && repo.blameError === null && repo.blameLines.length === 0 && (
              <pre className={styles.diff}>{t(lang, "blameEmpty")}</pre>
            )}
            {repo.blameLines.length !== 0 && (
              <section className={styles.diff} aria-label={t(lang, "blame")}>
                <div style={{ height: blameRows.totalHeight, position: "relative" }}>
                  <div style={{ transform: `translateY(${blameRows.offsetTop}px)` }}>
                    {blameRows.items.map(({ index }) => {
                      const { commit, summary, lineno, author, date } = repo.blameLines[index]
                      return (
                        <div key={lineno} className={styles.blameRow} title={`${commit} · ${summary}`}>
                          <span className={styles.ln}>{lineno}</span>
                          <button
                            type="button"
                            className={styles.sha}
                            onClick={() =>
                              setSelectedCommit({
                                hash: commit,
                                short: commit.slice(0, 7),
                                author: author,
                                date: date,
                                message: summary,
                                parents: [],
                                refs: [],
                              })
                            }
                            aria-label={`${t(lang, "commitDetails")}: ${commit.slice(0, 7)} — ${summary}`}
                          >
                            {commit}
                          </button>
                          <span className={styles.author}>{author}</span>
                          <span className={styles.date}>{date}</span>
                          <code className={styles.code}>{codeNodes[index] ?? " "}</code>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}
            {repo.editingFile !== null && (
              <Editor.File
                filePath={repo.editingFile}
                content={repo.editContent}
                draft={repo.editDraft}
                saving={repo.busy}
                onDraftChange={repo.setEditDraft}
                onSave={() => void repo.saveEditor()}
                onClose={() => void repo.closeEditor()}
              />
            )}
          </div>
          {selectedCommit && (
            <Modal title={t(lang, "commitDetails")} size="lg" onClose={() => setSelectedCommit(null)}>
              <Commit.Detail
                commit={selectedCommit}
                expanded
                resizable={false}
                onCherryPick={repo.cherryPick}
                onRevert={repo.revert}
                onReset={repo.resetBranch}
                onCheckout={(hash) => repo.checkoutBranch(hash)}
                loadFiles={repo.loadCommitFiles}
                loadDiff={repo.loadCommitDiff}
              />
            </Modal>
          )}
        </div>
      }
    />
  )
}
