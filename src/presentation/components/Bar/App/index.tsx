import { mergeStatsUseCase } from "../../../../data"
import classnames from "classnames"
import { useState, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { Location, NavigateFunction } from "react-router-dom"
import {
  Bolt,
  BookOpen,
  ChevronDown,
  FolderGit2,
  FolderOpen,
  GitBranch,
  Layers,
  RefreshCw,
  Settings as SettingsIcon,
  Undo2,
} from "lucide-react"

import { useRepo, useTranslation } from "../../../context"
import { useAltShortcut, useProfiles, useWindowDrag } from "../../../hooks"
import { Select } from "../../Select"
import { Repo } from "../../Repo"
import { SideBar } from "../../SideBar"
import { AppBrand } from "../../Brand"
import { BusyBar } from "../Busy"
import { HomeButton, NavToggleButton, SyncActions } from "../../Button"
import { ProfileSelect } from "../../Profile"
import { Status } from "../../Status"
import type { BranchInfo } from "../../../../types"
import styles from "./style.module.scss"

function formatBranchOptionLabel(name: string, behind?: number) {
  if (!name) return "—"
  if (behind && behind > 0) {
    return `${name} (↓${behind})`
  }
  return name
}

function buildBranchOptions(currentBranch: string, branches: BranchInfo[]) {
  const currentBranchInfo = branches.find((b) => b.name === currentBranch)
  const currentOption = {
    value: currentBranch,
    label: formatBranchOptionLabel(currentBranch, currentBranchInfo?.behind),
  }
  const otherOptions = branches
    .filter((branch) => branch.name !== currentBranch)
    .map((branch) => ({
      value: branch.name,
      label: formatBranchOptionLabel(branch.name, branch.behind),
    }))

  return [currentOption, ...otherOptions]
}

function useBranchOptions(branch: string, branches: BranchInfo[]) {
  return buildBranchOptions(branch, branches)
}

function useNavToggle(targetPath: "/docs" | "/settings" | "/staging", location: Location, navigate: NavigateFunction) {
  return useCallback(() => {
    const nextPath = location.pathname === targetPath ? "/staging" : targetPath
    navigate(nextPath)
  }, [location.pathname, navigate, targetPath])
}

function useHomeNavigation(onCloseRepo: () => void, navigate: NavigateFunction) {
  return useCallback(() => {
    onCloseRepo()
    navigate("/")
  }, [onCloseRepo, navigate])
}

const REPO_SWITCH_KEY = "r"

function AppBar() {
  const repo = useRepo()
  const { lang } = useTranslation()
  const profiles = useProfiles({
    lang,
    repoRoot: repo.repo,
    setMsg: repo.setMsg,
  })
  const navigate = useNavigate()
  const location = useLocation()
  const { t, format } = useTranslation()
  const windowDrag = useWindowDrag()
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [repoSwitchOpen, setRepoSwitchOpen] = useState(false)

  const isHome = location.pathname === "/"

  const handleNavigateHome = useHomeNavigation(() => repo.setRepoInput(""), navigate)
  const toggleDocs = useNavToggle("/docs", location, navigate)
  const toggleSettings = useNavToggle("/settings", location, navigate)

  const branchOptions = useBranchOptions(repo.status?.branch ?? "", repo.localBranches)

  const toggleRepoSwitch = useCallback(() => setRepoSwitchOpen((prev) => !prev), [])
  const confirmForcePush = useCallback(async () => {
    const confirmed = await repo.requestConfirm(t("pushForce"), t("pushForceConfirm"))
    if (confirmed) await repo.pushForce()
  }, [repo.requestConfirm, repo.pushForce, t])

  const confirmDeleteRemoteBranch = useCallback(
    async (remoteBranch: string) => {
      const confirmed = await repo.requestConfirm(
        t("deleteRemoteBranchAction"),
        format("deleteRemoteBranchConfirm", { name: remoteBranch }),
      )
      if (confirmed) await repo.deleteRemoteBranch(remoteBranch)
    },
    [repo.requestConfirm, repo.deleteRemoteBranch, t, format],
  )

  useAltShortcut(REPO_SWITCH_KEY, toggleRepoSwitch)

  const repoTooltip = repo.isSubmodule
    ? `${format("scopeSubmoduleOf", { parent: repo.parentRepo })}\n${repo.repo}`
    : repo.repo

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Tauri window drag region */}
      <div
        className={styles.appbar}
        data-tauri-drag-region
        onMouseDown={windowDrag.onMouseDown}
        onDoubleClick={windowDrag.onDoubleClick}
      >
        <AppBrand />
        <HomeButton isActive={isHome} onNavigateHome={handleNavigateHome} />
        <button
          type="button"
          className={classnames(styles.repoPill, repo.isSubmodule && styles.submodulePill)}
          onClick={toggleRepoSwitch}
          title={`${repoTooltip}\n${t("repoSwitcherToggle")} (Alt+R)`}
          aria-label={t("repoSwitcherToggle")}
          aria-expanded={repoSwitchOpen}
          disabled={!repo.repo}
        >
          {repo.isSubmodule ? (
            <Layers size={14} className={styles.repoIcon} />
          ) : (
            <FolderGit2 size={14} className={styles.repoIcon} />
          )}
          <span className={styles.repoName}>{repo.repoName}</span>
          {repo.isSubmodule && (
            <span className={styles.repoParent}>↑ {mergeStatsUseCase.repoBaseName(repo.parentRepo)}</span>
          )}
          <ChevronDown size={12} className={styles.repoChevron} />
        </button>
        <Select
          className={styles.branchSelect}
          icon={<GitBranch size={13} className={styles.branchIcon} />}
          label={t("checkout")}
          value={repo.status?.branch ?? ""}
          options={branchOptions}
          disabled={repo.localBranches.length === 0}
          onChange={repo.checkoutBranch}
        />
        <Status.Pill conflictCount={repo.unmergedCount} changedCount={repo.status?.files.length ?? 0} />
        <div className={styles.spacer} />
        <button
          type="button"
          className="ghost"
          disabled={!repo.canUndo || repo.busy}
          onClick={() => void repo.undoLast()}
          title={repo.undoLabel ? format("undoLastAction", { label: repo.undoLabel }) : t("undo")}
          aria-label={repo.undoLabel ? format("undoLastAction", { label: repo.undoLabel }) : t("undo")}
        >
          <Undo2 size={14} />
        </button>
        <SyncActions
          busy={repo.busy}
          behindCount={repo.status?.behind ?? 0}
          onFetch={(prune) => void repo.fetchPrune(prune)}
          onPull={() => void repo.pullIt()}
          onPush={() => void repo.pushIt()}
          onForcePush={() => void confirmForcePush()}
          onPushTags={() => void repo.pushTags()}
          onDeleteRemoteBranch={(name) => void confirmDeleteRemoteBranch(name)}
        />
        <ProfileSelect
          className={styles.profileSelect}
          profiles={profiles.profiles}
          activeProfileId={profiles.activeId}
          onSelectProfile={profiles.apply}
          onDeleteProfile={profiles.remove}
        />
        <NavToggleButton
          title={t("openRepo")}
          ariaLabel={t("openRepo")}
          isActive={false}
          onToggle={() => repo.setRepoInput("")}
        >
          <FolderOpen size={14} />
        </NavToggleButton>
        <NavToggleButton
          title={t("refresh")}
          ariaLabel={t("refresh")}
          isActive={false}
          onToggle={() => repo.refresh(repo.repo)}
        >
          <RefreshCw size={14} />
        </NavToggleButton>
        <NavToggleButton
          title={t("quickActions")}
          ariaLabel={t("quickActions")}
          isActive={quickActionsOpen}
          onToggle={() => setQuickActionsOpen((prev) => !prev)}
        >
          <Bolt size={14} />
        </NavToggleButton>
        <NavToggleButton
          title={t("docs")}
          ariaLabel={t("docs")}
          isActive={location.pathname === "/docs"}
          onToggle={toggleDocs}
        >
          <BookOpen size={14} />
        </NavToggleButton>
        <NavToggleButton
          title={t("settings")}
          ariaLabel={t("settings")}
          isActive={location.pathname === "/settings"}
          onToggle={toggleSettings}
        >
          <SettingsIcon size={14} />
        </NavToggleButton>

        <BusyBar visible={repo.busy} label={repo.busyLabel ?? undefined} startedAt={repo.busyStartedAt} />
      </div>
      <SideBar.QuickActions isOpen={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
      <Repo.Switch isOpen={repoSwitchOpen} onClose={() => setRepoSwitchOpen(false)} />
    </>
  )
}

export { AppBar }
