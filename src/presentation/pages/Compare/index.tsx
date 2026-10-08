import { ArrowRight, GitCompareArrows } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Navigate } from "react-router-dom"

import { Commit } from "../../components/Commit"
import { EmptyState } from "../../components/Empty/State"
import { Flex } from "../../components/Wrapper/Flex"
import { Modal } from "../../components/Modal"
import { Select } from "../../components/Select"
import { Skeleton } from "../../components/Skeleton"
import { useRepoCore, useSettingsContext } from "../../context"
import type { CompareRefsResult } from "../../hooks"
import { t } from "../../../i18n"
import type { CommitInfo } from "../../../types"
import styles from "./style.module.scss"

type Props = Record<string, never>

export function CompareRefsPage(_props: Props) {
  const { lang } = useSettingsContext()
  const repo = useRepoCore()
  const [base, setBase] = useState("")
  const [target, setTarget] = useState("")
  const [result, setResult] = useState<CompareRefsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  const refNames = useMemo(() => repo.branches.map((branch) => branch.name), [repo.branches])
  const refOptions = useMemo(() => refNames.map((name) => ({ value: name, label: name })), [refNames])

  useEffect(() => {
    if (base !== "" || refNames.length === 0) return
    const current = repo.status?.branch ?? ""
    setBase(refNames.includes(current) ? current : (refNames[0] ?? ""))
    setTarget(refNames.find((name) => name !== current) ?? refNames[0] ?? "")
  }, [base, refNames, repo.status?.branch])

  const runCompare = useCallback(async () => {
    if (!repo.repo || !base || !target) return
    if (base === target) {
      setError(t(lang, "compareSameRef"))
      setResult(null)
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setShowDiff(false)
    try {
      setResult(await repo.compareRefs(base, target))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [repo, base, target, lang])

  if (!repo.repo) return <Navigate to="/" replace />

  const heading = `${base} → ${target}`

  return (
    <div className={styles.page}>
      <Flex.Row className={styles.controls} align="end">
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t(lang, "compareBase")}</span>
          <Select label={t(lang, "compareBase")} value={base} options={refOptions} onChange={setBase} />
        </div>
        <ArrowRight size={15} className={styles.arrow} aria-hidden />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t(lang, "compareTarget")}</span>
          <Select label={t(lang, "compareTarget")} value={target} options={refOptions} onChange={setTarget} />
        </div>
        <button
          type="button"
          className="primary"
          disabled={loading || !base || !target}
          onClick={() => void runCompare()}
        >
          <GitCompareArrows size={14} /> {t(lang, "compareRun")}
        </button>
      </Flex.Row>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading && <Skeleton.Lines count={10} className={styles.skeleton} label={t(lang, "loading")} />}

      {!loading && result && (
        <>
          <div className={styles.summary}>
            <span>
              <strong>{result.ahead.length}</strong> {t(lang, "compareAhead")}
            </span>
            <span>
              <strong>{result.behind.length}</strong> {t(lang, "compareBehind")}
            </span>
            <span className={styles.mergeBase}>
              {t(lang, "compareMergeBase")} <code>{result.mergeBase.slice(0, 7)}</code>
            </span>
            <button type="button" className="mini-btn" onClick={() => setShowDiff(true)}>
              {t(lang, "compareFullDiff")}
            </button>
          </div>

          {result.files.length === 0 ? (
            <EmptyState message={t(lang, "compareNoFiles")} />
          ) : (
            <table className={styles.files}>
              <caption className={styles.srOnly}>{t(lang, "compareChangedFiles")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t(lang, "file")}</th>
                  <th scope="col">+</th>
                  <th scope="col">−</th>
                </tr>
              </thead>
              <tbody>
                {result.files.map((file) => (
                  <tr key={file.path}>
                    <th scope="row">
                      <code>{file.path}</code>
                    </th>
                    <td className={styles.added}>{file.added}</td>
                    <td className={styles.removed}>{file.removed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className={styles.commits}>
            <Commit.List
              commits={result.ahead}
              currentBranchName={target}
              showGraph={false}
              loading={false}
              onSelect={setSelectedCommit}
            />
          </div>
        </>
      )}

      {!loading && !result && !error && <EmptyState message={t(lang, "compareIdle")} />}

      {showDiff && result && (
        <Modal title={heading} size="lg" onClose={() => setShowDiff(false)}>
          <pre className={styles.diff}>{result.diff}</pre>
        </Modal>
      )}

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
  )
}
