import { ArrowRight, OctagonX, TriangleAlert } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { t } from "../../../i18n"
import type { TabItem } from "../../../types/components"
import { Bar } from "../../components/Bar"
import { Dialog } from "../../components/Dialog"
import { FatalError } from "../../components/FatalError"
import { Merge } from "../../components/Merge"
import { Toast } from "../../components/Toast"
import { Tabs } from "../../components/Tabs"
import { Windows } from "../../components/Window"
import { SearchProvider, useMessage, useRepo, useSettingsContext } from "../../context"
import { useProfiles } from "../../hooks"
import { useAutoRefresh } from "../../hooks/ui/useAutoRefresh"
import type { View } from "../../hooks"
import { VIEW_LABELS, VIEW_TABS } from "../../../shared/constants"
import styles from "./styles.module.scss"

export interface AppOutletContext {
  showRebase: boolean
  toggleRebase: () => void
}

export function AppLayout() {
  const { lang } = useSettingsContext()
  const [showRepoBar, setShowRepoBar] = useState(true)
  const [showRebase, setShowRebase] = useState(true)
  const [cloneUrl, setCloneUrl] = useState("")
  const [cloneDir, setCloneDir] = useState("")

  const navigate = useNavigate()
  const location = useLocation()
  const currentView = (location.pathname.split("/")[1] || "staging") as View
  const isWelcome = location.pathname === "/"

  const message = useMessage()
  const repo = useRepo()
  const { pendingConfirm } = repo
  const toggleRebase = useCallback(() => setShowRebase((s) => !s), [])
  const outletContext = useMemo<AppOutletContext>(() => ({ showRebase, toggleRebase }), [showRebase, toggleRebase])
  const profiles = useProfiles({
    lang,
    repoRoot: repo.repo,
    setMsg: repo.setMsg,
  })

  const viewTabItems: TabItem<View>[] = useMemo(() => {
    const getBadgeCount = (v: View): number =>
      v === "merge" ? repo.stats.remainingHunks : v === "staging" ? (repo.status?.files.length ?? 0) : 0

    const isAlert = (v: View): boolean => v === "merge" && repo.stats.remainingHunks > 0

    return VIEW_TABS.map(({ id, icon: Icon }) => {
      const count = getBadgeCount(id)
      return {
        id,
        label: t(lang, VIEW_LABELS[id]),
        icon: <Icon size={13} />,
        count: count > 0 ? count : undefined,
        alert: isAlert(id),
        title: id === "merge" ? t(lang, "conflictsDetected") : id === "staging" ? t(lang, "stagingDiff") : undefined,
      }
    })
  }, [lang, repo.stats.remainingHunks, repo.status?.files.length])

  useEffect(() => {
    if (!repo.msg) return
    message.response(repo.msg)
  }, [repo.msg, message.response])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "p") {
        e.preventDefault()
        void profiles.cycle()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [profiles.cycle])

  useAutoRefresh({ repoRoot: repo.repo, busy: repo.busy, opening: repo.opening, refresh: repo.refresh })

  return (
    <SearchProvider>
      <Windows.Frame>
        <Bar.App />
        {showRepoBar && (
          <Bar.Repo
            busy={repo.busy}
            openPath={repo.repoInput}
            cloneUrl={cloneUrl}
            cloneDir={cloneDir}
            recents={repo.recents}
            onOpenPath={repo.setRepoInput}
            onCloneUrl={setCloneUrl}
            onCloneDir={setCloneDir}
            onOpen={() => repo.handleOpen()}
            onBrowseDir={repo.handleBrowse}
            onBrowseCloneDir={() => repo.pickDir().then((p: string | null) => p && setCloneDir(p))}
            onClone={() => repo.cloneRepo(cloneUrl, cloneDir)}
            onSelectRecent={(p) => repo.openRecent(p)}
            onClearRecents={repo.clearRecents}
            onDone={() => setShowRepoBar(false)}
          />
        )}
        {repo.repo && !repo.opening && !isWelcome && currentView !== "docs" && (
          <div className={styles.viewTabsBar}>
            <Tabs<View>
              value={currentView}
              onChange={(nextView) => navigate(`/${nextView}`)}
              items={viewTabItems}
              variant="segmented"
              size="md"
              ariaLabel="View navigation"
            />
          </div>
        )}
        {repo.repo && !repo.opening && !isWelcome && (currentView === "merge" || repo.status?.merging) && (
          <Merge.Banner
            isMerging={repo.status?.merging ?? false}
            currentBranchName={repo.status?.branch ?? ""}
            sourceBranchName={repo.mergeBranch}
            totalHunks={repo.stats.totalHunks}
            resolvedHunks={repo.stats.resolvedHunks}
            remainingHunks={repo.stats.remainingHunks}
            rebaseCount={repo.log.length}
            branches={repo.localBranches}
            mergeInput={repo.mergeBranch}
            onMergeInputChange={repo.setMergeBranch}
            squashMerge={repo.mergeSquash}
            noFastForward={repo.mergeNoFF}
            onSquashChange={repo.setMergeSquash}
            onNoFastForwardChange={repo.setMergeNoFF}
            onStartMerge={repo.startMerge}
            onAbortMerge={repo.abortMerge}
            onContinueMerge={repo.continueMerge}
            onOpenTerminal={repo.openTerminalHint}
            onToggleRebase={toggleRebase}
          />
        )}
        {repo.repo && !repo.opening && !isWelcome && repo.status?.cherryPicking && (
          <div className={styles.syncBanner}>
            <span className={styles.alertIcon}>
              <TriangleAlert size={16} />
            </span>
            <strong>{t(lang, "cherryPickInProgress")}</strong>
            <div className="spacer" />
            <button type="button" className="mini-btn danger-t" onClick={repo.cherryPickAbort}>
              <OctagonX size={14} /> {t(lang, "abortCherryPick")}
            </button>
            <button type="button" className="mini-btn primary-t" onClick={repo.cherryPickContinue}>
              <ArrowRight size={14} /> {t(lang, "continueCherryPick")}
            </button>
          </div>
        )}
        {repo.repo && !repo.opening && !isWelcome && repo.status?.reverting && (
          <div className={styles.syncBanner}>
            <span className={styles.alertIcon}>
              <TriangleAlert size={16} />
            </span>
            <strong>{t(lang, "revertInProgress")}</strong>
            <div className="spacer" />
            <button type="button" className="mini-btn danger-t" onClick={repo.revertAbort}>
              <OctagonX size={14} /> {t(lang, "abortRevert")}
            </button>
            <button type="button" className="mini-btn primary-t" onClick={repo.revertContinue}>
              <ArrowRight size={14} /> {t(lang, "continueRevert")}
            </button>
          </div>
        )}

        <main className={styles.mainContent}>
          <Outlet context={outletContext} />
        </main>
        {repo.repo && !repo.opening && !isWelcome && (
          <Bar.Status
            root={repo.status?.root ?? repo.repo}
            branch={repo.status?.branch ?? ""}
            ahead={repo.status?.ahead ?? 0}
            behind={repo.status?.behind ?? 0}
            merging={repo.status?.merging ?? false}
            cherryPicking={repo.status?.cherryPicking}
            reverting={repo.status?.reverting}
            unmergedCount={repo.unmergedCount}
            changedCount={repo.status?.files.length ?? 0}
            profileName={profiles.active?.name ?? ""}
            profileEmoji={profiles.active?.emoji ?? ""}
            remoteUrl={repo.remoteUrl}
            gitVersion={repo.gitVersion}
            gpg={repo.gpg}
          />
        )}
        {pendingConfirm && (
          <Dialog.Confirm
            open={!!pendingConfirm}
            title={pendingConfirm.title}
            onCancel={() => pendingConfirm.resolve(false)}
            onConfirm={() => pendingConfirm.resolve(true)}
            confirmLabel="Confirmar"
            cancelLabel="Cancelar"
          >
            {pendingConfirm.message}
          </Dialog.Confirm>
        )}
      </Windows.Frame>
      <Toast.Container />
      {repo.lastError && (
        <FatalError
          message={repo.lastError}
          onDismiss={repo.clearError}
          onRetry={repo.repo ? () => void repo.refresh(repo.repo) : undefined}
        />
      )}
    </SearchProvider>
  )
}
