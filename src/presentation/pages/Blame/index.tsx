import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import { useSearchParams } from "react-router-dom"

import { Flex } from "@/presentation/components/Wrapper/Flex"
import { SearchBox } from "../../components/Search"
import { Status } from "../../components/Status"
import { Editor } from "../../components/Editor"
import { Commit } from "../../components/Commit"
import { Modal } from "../../components/Modal"
import { Resizable } from "@/presentation/components/Resizable"

import { useRepo, useSearch, useSettingsContext } from "../../context"
import { highlightLineHast } from "../../../main/adapters"
import { t } from "../../../i18n"
import type { CommitInfo, FileStatus } from "../../../types"

import styles from "./style.module.scss"

type Props = Record<string, never>

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
    if (fileParam && repoPath && fileParam !== blameFile) {
      void loadBlame(fileParam)
    }
  }, [fileParam, repoPath, blameFile, loadBlame])

  const handleSelectFile = useCallback(
    (filePath: string) => {
      setSearchParams((prev) => {
        const nextSearchParams = new URLSearchParams(prev)
        nextSearchParams.set("file", filePath)
        return nextSearchParams
      })
      repo.loadBlame(filePath)
    },
    [setSearchParams, repo.loadBlame],
  )

  const files: FileStatus[] = useMemo(() => {
    const name = scope === "commits" || scope === "branches" ? "" : query.trim().toLowerCase()

    return repo.trackedFiles
      .filter((file: string) => !name || file.toLowerCase().includes(name))
      .slice(0, 400)
      .map((path: string) => ({
        path,
        x: "",
        y: "",
        staged: false,
        unmerged: false,
      }))
  }, [repo.trackedFiles, query, scope])

  const codeNodes = useMemo(
    (): ReactNode[] =>
      repo.blameLines.map((line: (typeof repo.blameLines)[0]) => {
        if (line.text === "") return " "

        const tree = highlightLineHast(line.text, repo.blameFile)

        if (!tree) return line.text
        return toJsxRuntime(tree, { Fragment, jsx, jsxs })
      }),
    [repo.blameLines, repo.blameFile],
  )

  return (
    <Resizable.Layout
      sidebarWidth={{ initial: 300, min: 220, max: 560, storageKey: "blame.side" }}
      sidebar={
        <Fragment>
          <div className={styles.sideHead}>
            <strong>{t(lang, "blame").toUpperCase()}</strong>
            <span className={styles.pct}>{repo.trackedFiles.length}</span>
          </div>
          <SearchBox placeholder={t(lang, "searchFiles")} />
          <Status.File files={files} selectedFilePath={repo.blameFile} detailed={false} onSelect={handleSelectFile} />
        </Fragment>
      }
      main={
        <Flex.Row className={styles.wrapperMain}>
          <Flex.Col className={styles.wrapperFile}>
            <div className={styles.mainHead}>
              <h3>{repo.blameFile || t(lang, "treeBlame")}</h3>
              {repo.blameFile && (
                <button type="button" className="mini-btn" onClick={() => repo.openEditor(repo.blameFile)}>
                  {t(lang, "editFile")}
                </button>
              )}
            </div>
            {repo.blameLines.length === 0 && <pre className={styles.diff}>{t(lang, "blameEmpty")}</pre>}
            {repo.blameLines.length !== 0 && (
              <div className={styles.diff}>
                {repo.blameLines.map(
                  ({ commit, summary, lineno, author, date }: (typeof repo.blameLines)[0], lineIndex: number) => (
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
                        title={t(lang, "commitDetails")}
                      >
                        {commit}
                      </button>
                      <span className={styles.author}>{author}</span>
                      <span className={styles.date}>{date}</span>
                      <code className={styles.code}>{codeNodes[lineIndex] ?? " "}</code>
                    </div>
                  ),
                )}
              </div>
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
          </Flex.Col>
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
        </Flex.Row>
      }
    />
  )
}
