import { mergeStatsUseCase } from "../../../data"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Navigate } from "react-router-dom"
import { t } from "../../../i18n"

import { Branch } from "../../components/Branch"
import { Commit } from "../../components/Commit"
import { Diff } from "../../components/Diff"
import { Editor } from "../../components/Editor"
import { ExplorerTree } from "../../components/Explorer"
import { Flex } from "@/presentation/components/Wrapper/Flex"
import { Resizable } from "@/presentation/components/Resizable"
import { ResizeGrip } from "../../components/Resizable/Grip"
import { SearchBox } from "../../components/Search"
import { Status } from "../../components/Status"
import { Tabs } from "../../components/Tabs"
import { Tag } from "../../components/Tag"

import { useRepo, useSearch, useSettingsContext } from "../../context"
import { useResizable } from "../../hooks"
import { useWorktreeOps } from "../../hooks/repository/useWorktreeOps"
import { SelectionToolbar } from "./SelectionToolbar"
import { buildSideTabs, type SideTab } from "./sideTabs"
import { useStagingFiles } from "./useStagingFiles"

import styles from "./style.module.scss"

type Props = Record<string, never>

export function Staging(_props: Props) {
  const { lang } = useSettingsContext()
  const repo = useRepo()
  const { query, scope } = useSearch()
  const [tab, setTab] = useState<SideTab>("files")
  const worktrees = useWorktreeOps({ lang, repo: repo.repo, runAction: repo.runAction })

  useEffect(() => {
    if (tab === "explorer" && repo.repo) void repo.loadTracked()
  }, [tab, repo.repo, repo.loadTracked])
  useEffect(() => {
    if (tab === "worktrees" && repo.repo) void worktrees.loadWorktrees()
  }, [tab, repo.repo, worktrees.loadWorktrees])
  const diffHeight = useResizable({
    axis: "y",
    initial: 340,
    min: 160,
    max: 640,
    storageKey: "staging.diff",
    label: t(lang, "resizeDiff"),
  })

  const { files, selections, checkedPaths, clearSelection, runBatch, discardSelection } = useStagingFiles({
    statusFiles: repo.status?.files,
    query,
    scope,
    repoPath: repo.repo,
    discardFiles: repo.discardFiles,
  })

  const handleSelectDiff = useCallback(
    (filePath: string, staged: boolean) => repo.selectDiff(filePath, staged),
    [repo.selectDiff],
  )

  const branches = useMemo(
    () =>
      scope === "files" || scope === "commits"
        ? repo.branches
        : repo.branches.filter((branch) => mergeStatsUseCase.matchesQuery(branch.name, query)),
    [repo.branches, query, scope],
  )
  const tags = useMemo(
    () => (scope === "all" ? repo.tags.filter((tag) => mergeStatsUseCase.matchesQuery(tag, query)) : repo.tags),
    [repo.tags, query, scope],
  )
  const remotes = useMemo(
    () =>
      scope === "all"
        ? repo.remotes.filter((remote) =>
            [remote.name, remote.url].some((value) => mergeStatsUseCase.matchesQuery(value, query)),
          )
        : repo.remotes,
    [repo.remotes, query, scope],
  )

  const tabItems = useMemo(
    () =>
      buildSideTabs(lang, {
        files: repo.status?.files.length ?? 0,
        tracked: repo.trackedFiles.length,
        branches: repo.branches.length,
        tags: repo.tags.length,
        remotes: repo.remotes.length,
        stashes: repo.stashes.length,
        submodules: repo.submodules.length,
        worktrees: worktrees.worktrees.length,
      }),
    [
      lang,
      repo.status?.files.length,
      repo.trackedFiles.length,
      repo.branches.length,
      repo.tags.length,
      repo.remotes.length,
      repo.stashes.length,
      repo.submodules.length,
      worktrees.worktrees.length,
    ],
  )

  if (!repo.repo) return <Navigate to="/" replace />

  return (
    <Resizable.Layout
      className={styles.stagingLayout}
      sidebarWidth={{ initial: 300, min: 220, max: 560, storageKey: "staging.side", label: t(lang, "resizeSidebar") }}
      sidebar={
        <>
          <Flex.Col>
            <div className={styles.sideTabs}>
              <Tabs
                value={tab}
                onChange={setTab}
                items={tabItems}
                variant="segmented"
                fullWidth
                size="sm"
                ariaLabel={t(lang, "stagingSections")}
              />
            </div>
            <SearchBox placeholder={t(lang, "searchPh")} />
            {tab === "files" && (
              <SelectionToolbar
                count={checkedPaths.length}
                onStage={() => runBatch(repo.stageFiles)}
                onUnstage={() => runBatch(repo.unstageFiles)}
                onDiscard={discardSelection}
                onClear={clearSelection}
                busy={repo.busy}
              />
            )}
          </Flex.Col>
          {tab === "files" && (
            <Status.Sections
              files={files}
              selectedFilePath={repo.selectedFile}
              selections={selections}
              onSelect={handleSelectDiff}
              onStage={repo.stageFile}
              onUnstage={repo.unstageFile}
              onDiscard={repo.discardFile}
              onEdit={repo.openEditor}
              busy={repo.busy}
              onStageMany={repo.stageFiles}
              onUnstageMany={repo.unstageFiles}
              onDiscardMany={repo.discardFiles}
            />
          )}
          {tab === "branches" && (
            <Branch.Panel
              branches={branches}
              currentBranchName={repo.status?.branch ?? ""}
              newBranchName={repo.newBranch}
              onNewBranchNameChange={repo.setNewBranch}
              onCreateBranch={repo.createBranch}
              onCheckoutBranch={repo.checkoutBranch}
              onDeleteBranch={repo.deleteBranch}
              onRenameBranch={repo.renameBranch}
              onCreateBranchFrom={repo.createBranchFrom}
              busy={repo.busy}
            />
          )}
          {tab === "tags" && (
            <Tag.Panel
              tags={tags}
              onCreateTag={(tagName, tagMessage, signed) => repo.createTag(tagName, tagMessage, signed)}
              onDeleteTag={repo.deleteTag}
              onPushTag={repo.pushTag}
              busy={repo.busy}
            />
          )}
          {tab === "remotes" && (
            <Branch.Remote remotes={remotes} onAdd={repo.addRemote} onRemove={repo.removeRemote} busy={repo.busy} />
          )}
          {tab === "stash" && (
            <Branch.Stash
              stashMessage={repo.stashMsg}
              onStashMessageChange={repo.setStashMsg}
              keepIndex={repo.stashKeepIndex}
              onKeepIndexChange={repo.setStashKeepIndex}
              stagedOnly={repo.stashStagedOnly}
              onStagedOnlyChange={repo.setStashStagedOnly}
              pathspec={repo.stashPaths}
              onPathspecChange={repo.setStashPaths}
              onStash={repo.stashPush}
              onPop={repo.stashPopIt}
              onClear={repo.stashClear}
              stashes={repo.stashes}
              onApply={repo.stashApply}
              onApplyFile={repo.stashApplyFile}
              onBranch={repo.stashBranch}
              onDrop={repo.stashDrop}
              onShowDiff={repo.stashShow}
              busy={repo.busy}
            />
          )}
          {tab === "explorer" && (
            <ExplorerTree
              trackedFiles={repo.trackedFiles}
              statusFiles={repo.status?.files ?? []}
              query={scope === "files" || scope === "all" ? query : ""}
              selectedFilePath={repo.selectedFile}
              onSelect={handleSelectDiff}
              onStage={(filePath) => void repo.stageFile(filePath)}
              onUnstage={(filePath) => void repo.unstageFile(filePath)}
              busy={repo.busy}
            />
          )}
          {tab === "submodules" && (
            <Branch.Submodule
              submodules={repo.submodules}
              onUpdate={repo.submoduleUpdate}
              onSync={repo.submoduleSync}
              onAdd={repo.submoduleAdd}
              onRemove={repo.submoduleRemove}
              onOpen={(subPath) => repo.handleOpen(`${repo.repo}/${subPath}`)}
              busy={repo.busy}
            />
          )}
          {tab === "worktrees" && (
            <Branch.Worktree
              worktrees={worktrees.worktrees}
              onAdd={(path, branch) => void worktrees.addWorktree(path, branch)}
              onRemove={(path) => void worktrees.removeWorktree(path)}
              onLock={(path) => void worktrees.lockWorktree(path)}
              onUnlock={(path) => void worktrees.unlockWorktree(path)}
              onPrune={() => void worktrees.pruneWorktrees()}
              onOpen={(worktreePath) => repo.handleOpen(worktreePath)}
              busy={repo.busy}
            />
          )}
        </>
      }
      main={
        <>
          <h3>
            {t(lang, "diff")}: {repo.selectedFile || "—"}
          </h3>
          <div className={styles.diffWrap}>
            <Diff.Panel
              filePath={repo.selectedFile}
              isStaged={repo.diffStaged}
              diffContent={repo.diff}
              loaded={repo.diffLoaded}
              loading={repo.diffLoading}
              errorMessage={repo.diffError}
              maxHeight={diffHeight.size}
              onLoad={() => repo.loadDiff()}
              onStageHunk={repo.stageHunk}
              onUnstageHunk={repo.unstageHunk}
              onDiscardHunk={repo.discardHunk}
              onStageSelected={repo.stageSelected}
              onUnstageSelected={repo.unstageSelected}
            />
            <ResizeGrip axis="y" grip={diffHeight.grip} />
          </div>
          <Commit.Box
            value={repo.commitMsg}
            onChange={repo.setCommitMsg}
            hasStaged={(repo.status?.files ?? []).some((file) => file.staged)}
            onCommit={repo.doCommit}
            onStageAll={repo.stageAll}
            repoPath={repo.repo}
            branch={repo.status?.branch ?? ""}
          />
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
        </>
      }
    />
  )
}
