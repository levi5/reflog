import { useState, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { Location, NavigateFunction } from "react-router-dom"
import { Bolt, BookOpen, FolderGit2, FolderOpen, GitBranch, RefreshCw, Settings as SettingsIcon } from "lucide-react"

import { useRepo } from "../../../context"
import { useProfiles } from "../../../hooks"
import { useTranslation } from "../../../context"
import { useWindowDrag } from "../../../hooks"
import { Select } from "../../Select"
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
  const { t } = useTranslation()
  const windowDrag = useWindowDrag()
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)

  const isHome = location.pathname === "/"

  const handleNavigateHome = useHomeNavigation(() => repo.setRepoInput(""), navigate)
  const toggleDocs = useNavToggle("/docs", location, navigate)
  const toggleSettings = useNavToggle("/settings", location, navigate)

  const branchOptions = useBranchOptions(repo.status?.branch ?? "", repo.localBranches)

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
        <span className={styles.repoPill} title={repo.repoName}>
          <FolderGit2 size={14} className={styles.repoIcon} />
          <span className={styles.repoName}>{repo.repoName}</span>
        </span>
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
        <SyncActions
          busy={repo.busy}
          behindCount={repo.status?.behind ?? 0}
          onFetch={repo.fetchPrune}
          onPull={repo.pullIt}
          onPush={repo.pushIt}
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

        <BusyBar visible={repo.busy} />
      </div>
      <SideBar.QuickActions isOpen={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
    </>
  )
}

export { AppBar }
