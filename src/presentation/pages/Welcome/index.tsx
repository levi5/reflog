import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import classnames from "classnames"
import { Download, FolderPlus, FolderSearch, GitFork, History } from "lucide-react"

import { Spinner } from "../../components/Animation/Spinner"
import { LogoMark } from "../../components/Brand/Logo"
import { RecentCard } from "../../components/Recent"

import { t } from "../../../i18n"
import { useRepoCore, useSettingsContext } from "../../context"
import type { Lang } from "../../../types"

import styles from "./style.module.scss"

interface Props {
  lang?: Lang
  busy?: boolean
  recents?: string[]
  cloneUrl?: string
  cloneDir?: string
  onCloneUrl?: (v: string) => void
  onCloneDir?: (v: string) => void
  onBrowseCloneDir?: () => void
  onClone?: () => Promise<boolean>
  onSelectRecent?: (path: string) => Promise<boolean>
  onClearRecents?: () => void
  onRemoveRecent?: (path: string) => void
}

export function Welcome(props: Props) {
  const { lang: contextLang, reopenLastRepo } = useSettingsContext()
  const repo = useRepoCore()
  const lang = props.lang ?? contextLang
  const busy = props.busy ?? repo.busy
  const recents = props.recents ?? repo.recents
  const [localCloneUrl, setLocalCloneUrl] = useState("")
  const [localCloneDir, setLocalCloneDir] = useState("")
  const cloneUrl = props.cloneUrl ?? localCloneUrl
  const cloneDir = props.cloneDir ?? localCloneDir
  const onCloneUrl = props.onCloneUrl ?? setLocalCloneUrl
  const onCloneDir = props.onCloneDir ?? setLocalCloneDir
  const onBrowseCloneDir =
    props.onBrowseCloneDir ?? (() => repo.pickDir().then((p: string | null) => p && onCloneDir(p)))
  const onClone = props.onClone ?? (() => repo.cloneRepo(cloneUrl, cloneDir))
  const onSelectRecent = props.onSelectRecent ?? repo.openRecent
  const onClearRecents = props.onClearRecents ?? repo.clearRecents
  const onRemoveRecent = props.onRemoveRecent ?? repo.removeRecent
  const navigate = useNavigate()

  const canClone = !busy && cloneUrl.trim() !== "" && cloneDir.trim() !== ""

  const handleSelectRecent = useCallback(
    async (path: string) => {
      if (await onSelectRecent(path)) {
        navigate("/staging", { replace: true })
      }
    },
    [onSelectRecent, navigate],
  )

  const restoreAttemptedRef = useRef(false)
  useEffect(() => {
    if (!reopenLastRepo || restoreAttemptedRef.current) return
    if (repo.repo || repo.opening || busy || recents.length === 0) return
    restoreAttemptedRef.current = true
    void handleSelectRecent(recents[0])
  }, [reopenLastRepo, repo.repo, repo.opening, busy, recents, handleSelectRecent])

  const handleOpen = async () => {
    if (await repo.handleBrowse()) {
      navigate("/staging", { replace: true })
    }
  }

  const handleClone = async () => {
    if (await onClone()) {
      navigate("/staging", { replace: true })
    }
  }

  const handleInit = async () => {
    const path = await repo.pickDir()
    if (path && (await repo.initRepo(path))) {
      navigate("/staging", { replace: true })
    }
  }

  if (repo.opening) return <Spinner />

  return (
    <div className={styles.welcome}>
      <div className={styles.hero}>
        <LogoMark className={styles.logo} />
        <h1>{t(lang, "welcomeTitle")}</h1>
        <p>{t(lang, "welcomeSub")}</p>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardIcon}>
            <FolderSearch size={18} />
          </span>
          <div className={styles.cardMeta}>
            <strong>{t(lang, "openRepo")}</strong>
            <p>{t(lang, "welcomeOpenHint")}</p>
          </div>
          <button type="button" className={classnames("primary", styles.action)} onClick={handleOpen} disabled={busy}>
            {t(lang, "browse")}
          </button>
        </div>

        <div className={styles.card}>
          <span className={styles.cardIcon}>
            <FolderPlus size={18} />
          </span>
          <div className={styles.cardMeta}>
            <strong>{t(lang, "initRepo")}</strong>
            <p>{t(lang, "welcomeInitHint")}</p>
          </div>
          <button type="button" className={classnames("primary", styles.action)} onClick={handleInit} disabled={busy}>
            {t(lang, "initRepo")}
          </button>
        </div>

        <div className={styles.card}>
          <span className={styles.cardIcon}>
            <GitFork size={18} />
          </span>
          <div className={styles.cardMeta}>
            <strong>{t(lang, "clone")}</strong>
            <p>{t(lang, "welcomeCloneHint")}</p>
          </div>
          <div className={styles.cloneForm}>
            <input
              value={cloneUrl}
              onChange={(e) => onCloneUrl(e.target.value)}
              placeholder={t(lang, "cloneUrl")}
              aria-label={t(lang, "cloneUrl")}
              onKeyDown={(e) => e.key === "Enter" && canClone && handleClone()}
            />
            <div className={styles.cloneRow}>
              <input
                value={cloneDir}
                onChange={(e) => onCloneDir(e.target.value)}
                placeholder={t(lang, "cloneDir")}
                aria-label={t(lang, "cloneDir")}
                onKeyDown={(e) => e.key === "Enter" && canClone && handleClone()}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={onBrowseCloneDir}
                title={t(lang, "browse")}
                aria-label={t(lang, "browse")}
              >
                <FolderSearch size={14} />
              </button>
              <button
                type="button"
                className={classnames("primary", "icon-btn")}
                disabled={!canClone}
                onClick={handleClone}
                title={t(lang, "clone")}
                aria-label={t(lang, "clone")}
              >
                <Download size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <RecentCard
        recents={recents}
        busy={busy}
        onSelect={handleSelectRecent}
        onRemove={onRemoveRecent}
        onClear={onClearRecents}
        icon={<History size={14} />}
      />
    </div>
  )
}
