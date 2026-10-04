import classnames from "classnames"
import { Download, FolderOpen, FolderSearch, GitFork, History } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "../../../context"
import { RecentSelect } from "../../Recent"
import styles from "./style.module.scss"

type Mode = "open" | "clone"

interface Props {
  busy: boolean
  openPath: string
  cloneUrl: string
  cloneDir: string
  recents: string[]
  onOpenPath: (v: string) => void
  onCloneUrl: (v: string) => void
  onCloneDir: (v: string) => void
  onOpen: () => Promise<boolean>
  onBrowseDir: () => Promise<boolean>
  onBrowseCloneDir: () => void
  onClone: () => Promise<boolean>
  onSelectRecent: (path: string) => Promise<boolean>
  onClearRecents: () => void
  onDone: () => void
}

export function RepoBar(props: Props) {
  const {
    busy,
    openPath,
    cloneUrl,
    cloneDir,
    recents,
    onOpenPath,
    onCloneUrl,
    onCloneDir,
    onOpen,
    onBrowseDir,
    onBrowseCloneDir,
    onClone,
    onSelectRecent,
    onClearRecents,
    onDone,
  } = props
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>("open")
  const navigate = useNavigate()

  const open = async () => {
    if (busy || !(await onOpen())) return
    onDone()
    navigate("/staging", { replace: true })
  }

  const clone = async () => {
    if (busy || !(await onClone())) return
    onDone()
    navigate("/staging", { replace: true })
  }

  const browse = async () => {
    if (busy || !(await onBrowseDir())) return
    onDone()
    navigate("/staging", { replace: true })
  }

  const pickRecent = async (v: string) => {
    if (!v || busy || !(await onSelectRecent(v))) return
    onDone()
    navigate("/staging", { replace: true })
  }

  return (
    <div className={styles.repobar}>
      <div className={styles.modeToggle}>
        <button
          type="button"
          className={classnames(styles.modeBtn, mode === "open" && styles.active)}
          onClick={() => setMode("open")}
          title={t("open")}
          aria-label={t("open")}
          aria-pressed={mode === "open"}
        >
          <FolderOpen size={14} />
        </button>
        <button
          type="button"
          className={classnames(styles.modeBtn, mode === "clone" && styles.active)}
          onClick={() => setMode("clone")}
          title={t("clone")}
          aria-label={t("clone")}
          aria-pressed={mode === "clone"}
        >
          <GitFork size={14} />
        </button>
      </div>
      {mode === "open" ? (
        <>
          <RecentSelect
            recents={recents}
            value={openPath}
            disabled={busy}
            onChange={pickRecent}
            onClear={onClearRecents}
            icon={<History size={14} />}
          />
          <input
            value={openPath}
            onChange={(event) => onOpenPath(event.target.value)}
            placeholder={t("repoPath")}
            aria-label={t("repoPath")}
            onKeyDown={(event) => event.key === "Enter" && open()}
          />
          <button
            type="button"
            className={classnames("icon-btn", styles.iconBtn)}
            onClick={browse}
            disabled={busy}
            title={t("browse")}
            aria-label={t("browse")}
          >
            <FolderSearch size={14} />
          </button>
        </>
      ) : (
        <>
          <input
            className={styles.grow}
            value={cloneUrl}
            onChange={(event) => onCloneUrl(event.target.value)}
            placeholder={t("cloneUrl")}
            aria-label={t("cloneUrl")}
            onKeyDown={(event) => event.key === "Enter" && clone()}
          />
          <input
            value={cloneDir}
            onChange={(event) => onCloneDir(event.target.value)}
            placeholder={t("cloneDir")}
            aria-label={t("cloneDir")}
            onKeyDown={(event) => event.key === "Enter" && clone()}
          />
          <button
            type="button"
            className={classnames("icon-btn", styles.iconBtn)}
            onClick={onBrowseCloneDir}
            title={t("browse")}
            aria-label={t("browse")}
          >
            <FolderSearch size={14} />
          </button>
          <button
            type="button"
            className={classnames("primary", "icon-btn", styles.iconBtn)}
            disabled={busy || !cloneUrl.trim() || !cloneDir.trim()}
            onClick={clone}
            title={t("clone")}
            aria-label={t("clone")}
          >
            <Download size={14} />
          </button>
        </>
      )}
    </div>
  )
}
