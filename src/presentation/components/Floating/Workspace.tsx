import { invoke } from "@tauri-apps/api/core"
import { open as chooseDirectory } from "@tauri-apps/plugin-dialog"
import {
  ArrowLeft,
  Archive,
  Check,
  ExternalLink,
  FileDiff,
  FolderOpen,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  RefreshCw,
  Scaling,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "../../context"
import { requestFloating, type FloatingOperation, type FloatingSnapshot } from "./bridge"
import styles from "./workspace.module.scss"
import { useFloatingDrag } from "./useFloatingDrag"
import { useFloatingResize } from "./useFloatingResize"
import { FloatingWindowTools } from "./WindowTools"
import { Select } from "../Select"
import { FloatingCommitFiles } from "./CommitFiles"

type FileFilter = "all" | "stash"
interface Review {
  operation: FloatingOperation
  title: string
  detail: string
  paths?: string[]
}

export function FloatingWorkspace({
  view,
  onBack,
  drafts,
  onDraft,
  initialFilter = "all",
}: {
  view: "commit" | "merge"
  onBack: () => void
  drafts: Record<string, string>
  onDraft: (path: string, value: string) => void
  initialFilter?: "all" | "stash"
}) {
  const { t, format } = useTranslation()
  const [snapshot, setSnapshot] = useState<FloatingSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const drag = useFloatingDrag(setError)
  const resize = useFloatingResize(setError)
  const [notice, setNotice] = useState("")
  const [filter, setFilter] = useState<FileFilter>(initialFilter)
  const [branch, setBranch] = useState("")
  const [squash, setSquash] = useState(false)
  const [noFf, setNoFf] = useState(false)
  const [stashMessage, setStashMessage] = useState("")
  const [review, setReview] = useState<Review | null>(null)
  const [preview, setPreview] = useState<{ title: string; text: string } | null>(null)
  const locked = useRef(false)
  const alive = useRef(true)
  const revision = useRef(0)
  const previewRevision = useRef(0)
  const snapshotPath = useRef<string | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const modalOpen = !!review || !!preview

  useEffect(() => {
    if (!modalOpen) return
    const previous = document.activeElement as HTMLElement | null
    const target =
      dialog.current?.querySelector<HTMLElement>("[data-dialog-initial]") ??
      dialog.current?.querySelector<HTMLElement>("button, textarea")
    target?.focus()
    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [modalOpen])

  const refresh = useCallback(async () => {
    const version = ++revision.current
    try {
      const next = await requestFloating<FloatingSnapshot>({ kind: "snapshot" })
      if (alive.current && version === revision.current) {
        if (snapshotPath.current !== null && snapshotPath.current !== next.repoPath) {
          setReview(null)
          setPreview(null)
          previewRevision.current++
          setBranch("")
          setNotice("")
        }
        snapshotPath.current = next.repoPath
        setSnapshot(next)
      }
    } catch (e) {
      if (alive.current && version === revision.current) setError(String(e))
    } finally {
      if (alive.current && version === revision.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    void refresh()
    const interval = setInterval(() => {
      if (!locked.current) void refresh()
    }, 5000)
    return () => {
      alive.current = false
      clearInterval(interval)
      previewRevision.current++
    }
  }, [refresh])

  const path = snapshot?.repoPath ?? ""
  const status = snapshot?.status
  const files = status?.files ?? []
  const staged = files.filter((file) => file.staged && !file.unmerged)
  const conflicts = files.filter((file) => file.unmerged)
  const disabled = busy || snapshot?.busy || loading
  const message = drafts[path] ?? ""
  const inProgress = status?.merging || status?.rebasing || status?.cherryPicking || status?.reverting

  async function run(operation: FloatingOperation) {
    if (locked.current || disabled) return
    locked.current = true
    setBusy(true)
    setError("")
    setNotice("")
    setReview(null)
    try {
      await requestFloating(operation, path)
      if (operation.kind === "commit") onDraft(path, "")
      if (operation.kind === "stash") setStashMessage("")
      setNotice(t("floatingDone"))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      await refresh() // A failed merge or stash apply may have created conflicts.
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }

  async function showPreview(operation: FloatingOperation, title: string) {
    const version = ++previewRevision.current
    setPreview({ title, text: t("loading") })
    try {
      const text = await requestFloating<string>(operation, path)
      if (alive.current && version === previewRevision.current)
        setPreview({ title, text: text || t("floatingEmptyDiff") })
    } catch (e) {
      if (alive.current && version === previewRevision.current) setPreview({ title, text: String(e) })
    }
  }

  function openMain(action = view) {
    void invoke("floating_action", { action })
      .then(onBack)
      .catch((e) => setError(String(e)))
  }

  async function openRepository() {
    if (locked.current || busy) return
    locked.current = true
    setBusy(true)
    setError("")
    try {
      const selected = await chooseDirectory({ directory: true, multiple: false, title: t("openRepo") })
      if (typeof selected !== "string") return
      await requestFloating({ kind: "open-repo", path: selected })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }

  function commitReview() {
    if (!status) return
    setReview({
      operation: {
        kind: "commit",
        message,
        stagedPaths: staged.map((file) => file.path),
        head: status.head,
        branch: status.branch,
      },
      title: t("floatingConfirmCommit"),
      detail: message.trim(),
      paths: staged.map((file) => file.path),
    })
  }

  const filters: { id: FileFilter; label: string; count: number }[] = [
    { id: "all", label: t("floatingFiles"), count: files.length },
    { id: "stash", label: "Stash", count: snapshot?.stashes.length ?? 0 },
  ]

  return (
    <section
      className={styles.workspace}
      aria-label={t(view === "commit" ? "floatingQuickCommit" : "floatingQuickMerge")}
      onPointerMove={(event) => {
        drag.onPointerMove(event)
        resize.onPointerMove(event)
      }}
      onPointerUp={() => {
        drag.onPointerUp()
        resize.onPointerUp()
      }}
      onPointerCancel={drag.onPointerCancel}
      onMouseEnter={(event) => {
        drag.onMouseEnter(event)
        resize.onMouseEnter(event)
      }}
      onKeyDown={(event) => {
        if (event.defaultPrevented) return
        if (event.key === "Escape" && !busy) {
          event.stopPropagation()
          if (review) setReview(null)
          else if (preview) {
            previewRevision.current++
            setPreview(null)
          } else onBack()
        }
        if (event.key === "Tab" && modalOpen) {
          const elements = Array.from(
            dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), textarea") ?? [],
          )
          const first = elements[0]
          const last = elements.at(-1)
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }
      }}
    >
      <header className={styles.header}>
        <button type="button" className="ghost" onClick={onBack} disabled={busy} aria-label={t("floatingBack")}>
          <ArrowLeft size={16} />
        </button>
        <button type="button" className={styles.heading} title={t("floatingDrag")} onPointerDown={drag.onPointerDown}>
          <strong>{t(view === "commit" ? "floatingQuickCommit" : "floatingQuickMerge")}</strong>
          <small title={path}>{path.split(/[\\/]/).pop() || "Reflog"}</small>
        </button>
        <FloatingWindowTools onMove={drag.onPointerDown} onReset={resize.reset} />
        {path && (
          <button
            type="button"
            className="ghost"
            disabled={disabled}
            onClick={() => void openRepository()}
            aria-label={t("openRepo")}
            title={t("openRepo")}
          >
            <FolderOpen size={15} />
          </button>
        )}
        <button
          type="button"
          className="ghost"
          disabled={disabled}
          onClick={() => void refresh()}
          aria-label={t("refresh")}
        >
          <RefreshCw size={15} className={busy ? styles.spin : ""} />
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => openMain()}
          aria-label={t("floatingPanel")}
          title={t("floatingPanel")}
        >
          <ExternalLink size={15} />
        </button>
      </header>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
          <button type="button" onClick={() => setError("")} aria-label={t("close")}>
            <X size={12} />
          </button>
        </div>
      )}
      {notice && (
        <div role="status" className={styles.success}>
          <Check size={14} />
          {notice}
        </div>
      )}
      {loading && <p className={styles.empty}>{t("loading")}…</p>}
      {!loading && !path && (
        <div className={styles.empty}>
          <GitBranch size={28} />
          <p>{t("noRepo")}</p>
          <button type="button" className="primary" disabled={busy} onClick={() => void openRepository()}>
            {t("openRepo")}
          </button>
        </div>
      )}
      {path && status && (
        <>
          <div className={styles.repoStatus}>
            <GitBranch size={13} />
            <strong>{status.branch || "HEAD"}</strong>
            <span>
              ↑{status.ahead} ↓{status.behind}
            </span>
            {snapshot?.busy && <small>{t("floatingBusy")}</small>}
          </div>
          {conflicts.length > 0 && (
            <div className={styles.conflictBanner}>
              <strong>{format("floatingConflictCount", { count: conflicts.length })}</strong>
              <button type="button" onClick={() => openMain("merge")}>
                {t("floatingResolve")}
              </button>
            </div>
          )}
          <div className={styles.body}>
            {view === "commit" ? (
              <>
                <fieldset className={styles.filters} aria-label={t("floatingFileGroups")}>
                  {filters.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                      <b>{item.count}</b>
                    </button>
                  ))}
                </fieldset>
                {filter !== "stash" ? (
                  <FloatingCommitFiles
                    files={files}
                    disabled={!!disabled}
                    onRun={(operation) => void run(operation)}
                    onPreview={(file) => void showPreview({ kind: "diff", file }, file.path)}
                  />
                ) : (
                  <div className={styles.stashes}>
                    <p className={styles.hint}>{t("floatingStashHint")}</p>
                    <input
                      aria-label={t("floatingStashMessage")}
                      placeholder={t("floatingStashMessage")}
                      value={stashMessage}
                      onChange={(event) => setStashMessage(event.target.value)}
                      disabled={disabled}
                    />
                    <button
                      type="button"
                      disabled={disabled || !files.length || !!conflicts.length || !!inProgress}
                      onClick={() =>
                        setReview({
                          operation: { kind: "stash", message: stashMessage },
                          title: t("floatingSaveStash"),
                          detail: t("floatingSaveStashHint"),
                          paths: files.map((file) => file.path),
                        })
                      }
                    >
                      <Archive size={14} />
                      {t("floatingSaveStash")}
                    </button>
                    {!snapshot?.stashes.length && <p className={styles.empty}>{t("floatingNoStashes")}</p>}
                    {snapshot?.stashes.map((stash) => (
                      <article className={styles.stash} key={`${stash.index}:${stash.hash}`}>
                        <strong>{stash.selector}</strong>
                        <p>{stash.message}</p>
                        <small>{stash.date}</small>
                        <div>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              void showPreview(
                                { kind: "stash-diff", index: stash.index, hash: stash.hash },
                                stash.selector,
                              )
                            }
                          >
                            {t("diff")}
                          </button>
                          <button
                            type="button"
                            disabled={disabled || !!files.length || !!inProgress}
                            onClick={() =>
                              setReview({
                                operation: { kind: "stash-apply", index: stash.index, hash: stash.hash },
                                title: t("floatingApplyStash"),
                                detail: `${stash.selector}: ${stash.message}. ${t("floatingKeepStash")}`,
                              })
                            }
                          >
                            {t("floatingApplyStash")}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.merge}>
                <div className={styles.mergeFlow}>
                  <GitBranch size={22} />
                  <span>{branch || t("floatingChooseBranch")}</span>
                  <span>→</span>
                  <strong>{status.branch}</strong>
                </div>
                {inProgress && <p className={styles.warning}>{t("floatingOperationInProgress")}</p>}
                <div className={styles.branchPicker}>
                  <span>{t("floatingMergeSource")}</span>
                  <Select
                    label={t("floatingMergeSource")}
                    className={styles.branchSelect}
                    buttonClassName={styles.branchSelectButton}
                    icon={<GitBranch size={15} />}
                    value={branch}
                    onChange={setBranch}
                    disabled={disabled || !!inProgress}
                    options={[
                      { value: "", label: t("floatingChooseBranch") },
                      ...(snapshot?.branches
                        .filter((item) => !item.current)
                        .map((item) => ({ value: item.name, label: item.name })) ?? []),
                    ]}
                  />
                </div>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={squash}
                    onChange={(event) => {
                      setSquash(event.target.checked)
                      if (event.target.checked) setNoFf(false)
                    }}
                    disabled={disabled || !!inProgress}
                  />
                  {t("floatingSquash")}
                </label>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={noFf}
                    onChange={(event) => {
                      setNoFf(event.target.checked)
                      if (event.target.checked) setSquash(false)
                    }}
                    disabled={disabled || !!inProgress}
                  />
                  {t("floatingNoFf")}
                </label>
                {!!files.length && !inProgress && <p className={styles.warning}>{t("floatingMergeBlocked")}</p>}
                <button
                  type="button"
                  className="primary"
                  disabled={disabled || !branch || !!files.length || !!inProgress}
                  onClick={() =>
                    setReview({
                      operation: { kind: "merge", branch, target: status.branch, head: status.head, squash, noFf },
                      title: t("floatingConfirmMerge"),
                      detail: `${branch} → ${status.branch}${squash ? " (squash)" : noFf ? " (--no-ff)" : ""}`,
                    })
                  }
                >
                  <GitMerge size={15} />
                  {t("floatingReviewMerge")}
                </button>
                <hr />
                <strong>{t("floatingConflictCenter")}</strong>
                <p className={styles.hint}>{conflicts.length ? t("floatingResolveHint") : t("floatingNoConflicts")}</p>
                {conflicts.map((file) => (
                  <button
                    type="button"
                    className={styles.conflictFile}
                    key={file.path}
                    onClick={() => openMain("merge")}
                  >
                    <FileDiff size={15} />
                    {file.path}
                    <ExternalLink size={13} />
                  </button>
                ))}
                <button type="button" onClick={() => openMain("merge")}>
                  <ExternalLink size={14} />
                  {t("floatingResolve")}
                </button>
              </div>
            )}
          </div>
          {view === "commit" && filter !== "stash" && (
            <footer className={styles.commitFooter}>
              <label htmlFor="quick-commit-message">{t("floatingCommitMessage")}</label>
              <textarea
                id="quick-commit-message"
                rows={3}
                value={message}
                onChange={(event) => onDraft(path, event.target.value)}
                disabled={disabled}
                placeholder={t("floatingCommitPlaceholder")}
              />
              <div>
                <small>{format("floatingStagedCount", { count: staged.length })}</small>
                <button
                  type="button"
                  className="primary"
                  disabled={disabled || !staged.length || !message.trim() || !!conflicts.length || !!inProgress}
                  onClick={commitReview}
                >
                  <GitCommitHorizontal size={16} />
                  {t("floatingReviewCommit")}
                </button>
              </div>
            </footer>
          )}
        </>
      )}
      {preview && (
        <div ref={dialog} className={styles.overlay} role="dialog" aria-modal="true" aria-label={preview.title}>
          <header>
            <strong title={preview.title}>{preview.title}</strong>
            <FloatingWindowTools onMove={drag.onPointerDown} onReset={resize.reset} />
            <button
              type="button"
              data-dialog-initial
              aria-label={t("close")}
              onClick={() => {
                previewRevision.current++
                setPreview(null)
              }}
            >
              <X size={16} />
            </button>
          </header>
          <textarea readOnly wrap="off" aria-label={t("diff")} value={preview.text} />
          <button
            type="button"
            onClick={() => {
              previewRevision.current++
              setPreview(null)
            }}
          >
            {t("floatingBack")}
          </button>
        </div>
      )}
      {review && (
        <div ref={dialog} className={styles.overlay} role="dialog" aria-modal="true" aria-label={review.title}>
          <header>
            <strong>{review.title}</strong>
            <FloatingWindowTools onMove={drag.onPointerDown} onReset={resize.reset} />
          </header>
          <p className={styles.reviewBranch}>
            <GitBranch size={14} />
            {status?.branch}
          </p>
          <p className={styles.reviewDetail}>{review.detail}</p>
          {review.paths && (
            <ul>
              {review.paths.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          )}
          <div className={styles.reviewActions}>
            <button type="button" data-dialog-initial onClick={() => setReview(null)}>
              {t("cancel")}
            </button>
            <button type="button" className="primary" disabled={disabled} onClick={() => void run(review.operation)}>
              {t("confirm")}
            </button>
          </div>
        </div>
      )}
      <div className={styles.resizeBar}>
        <button
          type="button"
          className={styles.resizeGrip}
          onPointerDown={resize.onPointerDown}
          aria-label={t("floatingResizeWindow")}
          title={t("floatingResizeWindow")}
        >
          <Scaling size={17} />
        </button>
      </div>
    </section>
  )
}
