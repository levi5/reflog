import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"

import { SearchBox } from "../../components/Search"
import { Status } from "../../components/Status"
import { Editor } from "../../components/Editor"
import { Commit } from "../../components/Commit"
import { Resizable } from "@/presentation/components/Resizable"

import { useRepo, useSearch, useSettingsContext } from "../../context"
import { highlightLineHast } from "../../../main/adapters"
import { t } from "../../../i18n"
import type { CommitInfo, FileStatus } from "../../../types"

import styles from "./style.module.scss"
import { Flex } from "@/presentation/components/Wrapper/Flex"

type Props = Record<string, never>

export function Blame(_props: Props) {
  const { lang } = useSettingsContext()
  const repo = useRepo()
  const { query, scope } = useSearch()
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)

  useEffect(() => {
    if (repo.repo) void repo.loadTracked()
  }, [repo.repo, repo.loadTracked])

  const files: FileStatus[] = useMemo(() => {
    const q = scope === "commits" || scope === "branches" ? "" : query.trim().toLowerCase()
    return repo.trackedFiles
      .filter((p: string) => !q || p.toLowerCase().includes(q))
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
      repo.blameLines.map((l: (typeof repo.blameLines)[0]) => {
        if (l.text === "") return " "
        const tree = highlightLineHast(l.text, repo.blameFile)
        if (!tree) return l.text
        return toJsxRuntime(tree, { Fragment, jsx, jsxs })
      }),
    [repo.blameLines, repo.blameFile],
  )

  return (
    <Resizable.Layout
      sidebarWidth={{ initial: 300, min: 220, max: 560, storageKey: "blame.side" }}
      sidebar={
        <>
          <div className={styles.sideHead}>
            <strong>{t(lang, "blame").toUpperCase()}</strong>
            <span className={styles.pct}>{repo.trackedFiles.length}</span>
          </div>
          <SearchBox placeholder={t(lang, "searchFiles")} />
          <Status.File
            files={files}
            selectedFilePath={repo.blameFile}
            detailed={false}
            onSelect={(filePath) => repo.loadBlame(filePath)}
          />
        </>
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
            {repo.blameLines.length === 0 ? (
              <pre className={styles.diff}>{t(lang, "blameEmpty")}</pre>
            ) : (
              <div className={styles.diff}>
                {repo.blameLines.map((l: (typeof repo.blameLines)[0], i: number) => (
                  <div key={l.lineno} className={styles.blameRow} title={`${l.commit} · ${l.summary}`}>
                    <span className={styles.ln}>{l.lineno}</span>
                    <button
                      type="button"
                      className={styles.sha}
                      onClick={() =>
                        setSelectedCommit({
                          hash: l.commit,
                          short: l.commit.slice(0, 7),
                          author: l.author,
                          date: l.date,
                          message: l.summary,
                          parents: [],
                          refs: [],
                        })
                      }
                      title={t(lang, "commitDetails")}
                    >
                      {l.commit}
                    </button>
                    <span className={styles.author}>{l.author}</span>
                    <span className={styles.date}>{l.date}</span>
                    <code className={styles.code}>{codeNodes[i] ?? " "}</code>
                  </div>
                ))}
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
            <Commit.Detail
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
        </Flex.Row>
      }
    />
  )
}
