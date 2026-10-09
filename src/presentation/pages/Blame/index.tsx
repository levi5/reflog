import classnames from "classnames"
import { codeHighlightUseCase } from "../../../data"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import { useSearchParams } from "react-router-dom"

import { SearchBox } from "../../components/Search"
import { Status } from "../../components/Status"
import { BusyBar } from "../../components/Bar/Busy"
import { Editor } from "../../components/Editor"
import { Commit } from "../../components/Commit"
import { Resizable } from "@/presentation/components/Resizable"
import { Skeleton } from "../../components/Skeleton"
import { useVirtualRows } from "../../hooks/ui/useVirtualRows"

import { useRepo, useSearch, useSettingsContext } from "../../context"
import { t } from "../../../i18n"
import type { CommitInfo, FileStatus } from "../../../types"

import styles from "./style.module.scss"

type Props = Record<string, never>

const TRACKED_FILE_LIMIT = 400
const VIRTUALIZE_AFTER_LINES = 200

export const Blame = (_props: Props) => {
  const { lang } = useSettingsContext()
  const repo = useRepo()
  const { query, scope } = useSearch()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)
  const fileParam = searchParams.get("file")
  const repoPath = repo.repo
  const blameFile = repo.blameFile
  const blameLines = repo.blameLines
  const loadTracked = repo.loadTracked

  useEffect(() => {
    if (repoPath) void loadTracked()
  }, [repoPath, loadTracked])

  useEffect(() => {
    if (fileParam && repoPath && fileParam !== blameFile) void repo.loadBlame(fileParam)
  }, [fileParam, repoPath, blameFile, repo.loadBlame])

  const handleSelectFile = useCallback(
    (filePath: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set("file", filePath)
        return next
      })
    },
    [setSearchParams],
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

  const blameRows = useVirtualRows({
    count: blameLines.length,
    estimate: 22,
    overscan: 24,
    enabled: blameLines.length > VIRTUALIZE_AFTER_LINES,
    resetKey: blameFile,
  })

  const visibleRows = blameRows.items.map(({ index }) => {
    const line = blameLines[index]
    if (!line) return null
    const tree = line.text === "" ? null : codeHighlightUseCase.highlightLineHast(line.text, blameFile)
    return {
      line,
      code: tree ? toJsxRuntime(tree, { Fragment, jsx, jsxs }) : line.text,
    }
  })

  const hasContent = blameLines.length > 0
  const showSkeleton = repo.blameLoading && !hasContent
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
          <Status.File files={files} selectedFilePath={blameFile} detailed={false} onSelect={handleSelectFile} />
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
              <h3 className={classnames(styles.fileTitle, repo.blameStale && styles.fileTitleStale)}>
                {blameFile || t(lang, "treeBlame")}
              </h3>
              {blameFile && (
                <button type="button" className="mini-btn" onClick={() => repo.openEditor(blameFile)}>
                  {t(lang, "editFile")}
                </button>
              )}
            </div>
            <BusyBar visible={repo.blameLoading} label={t(lang, "blameLoading")} />
            {showSkeleton && <Skeleton.Lines count={18} label={t(lang, "blameLoading")} className={styles.skeleton} />}
            {!repo.blameLoading && repo.blameError !== null && (
              <p className={styles.error} role="alert">
                {t(lang, "blameFailed")}
              </p>
            )}
            {!hasContent && !showSkeleton && repo.blameError === null && (
              <pre className={styles.diff}>{t(lang, "blameEmpty")}</pre>
            )}
            {hasContent && (
              <section
                key={blameFile}
                className={classnames(styles.diff, repo.blameStale && styles.diffStale)}
                aria-label={t(lang, "blame")}
                aria-busy={repo.blameLoading}
                onScroll={blameRows.onScroll}
              >
                <div style={{ height: blameRows.totalHeight, position: "relative" }}>
                  <div style={{ transform: `translateY(${blameRows.offsetTop}px)` }}>
                    {visibleRows.map((row) => {
                      if (!row) return null
                      const { commit, summary, lineno, author, date } = row.line
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
                                author,
                                date,
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
                          <code className={styles.code}>{row.code}</code>
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
            <Commit.DetailModal
              commit={selectedCommit}
              onClose={() => setSelectedCommit(null)}
              onCherryPick={repo.cherryPick}
              onRevert={repo.revert}
              onReset={repo.resetBranch}
              onCheckout={(hash) => repo.checkoutBranch(hash)}
              loadFiles={repo.loadCommitFiles}
              loadDiff={repo.loadCommitDiff}
            />
          )}
        </div>
      }
    />
  )
}
