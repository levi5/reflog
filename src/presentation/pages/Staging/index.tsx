import { Archive, Boxes, Cloud, FileDiff, GitBranch, Tag as TagIcon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { Navigate } from "react-router-dom"
import { matchesQuery } from "../../../main/adapters"
import { t } from "../../../i18n"

import { Branch } from "../../components/Branch"
import { Commit } from "../../components/Commit"
import { Diff } from "../../components/Diff"
import { Editor } from "../../components/Editor"
import { Flex } from "@/presentation/components/Wrapper/Flex"
import { Resizable } from "@/presentation/components/Resizable"
import { ResizeGrip } from "../../components/Resizable/Grip"
import { SearchBox } from "../../components/Search"
import { Status } from "../../components/Status"
import { Tabs } from "../../components/Tabs"
import { Tag } from "../../components/Tag"

import { _Maybe } from "funcio"
import { useRepo, useSearch, useSettingsContext } from "../../context"
import { useResizable } from "../../hooks"
import { useFileSelection } from "../../hooks/staging/use-file-selection"
import type { FileStatus } from "@/types"
import type { TabItem } from "../../../types/components"
import { SelectionToolbar } from "./SelectionToolbar"

import styles from "./style.module.scss"

type SideTab = "files" | "branches" | "tags" | "remotes" | "stash" | "submodules"

type Props = Record<string, never>

export function Staging(_props: Props) {
  const { lang } = useSettingsContext()
  const repo = useRepo()
  const { query, scope } = useSearch()
  const [tab, setTab] = useState<SideTab>("files")
  const diffHeight = useResizable({
    axis: "y",
    initial: 340,
    min: 160,
    max: 640,
    storageKey: "staging.diff",
  })

  const statusFiles = repo.status?.files
  const files = useMemo<FileStatus[]>(
    () =>
      _Maybe
        .of(statusFiles ?? [])
        .map((files) => files)
        .when(scope === "branches" || scope === "commits")
        .then((files: FileStatus[]) =>
          files.filter((file) => (scope === "branches" || scope === "commits" ? file : matchesQuery(file.path, query))),
        )
        .else((files: FileStatus[]) => files)
        .getOrElse([]) as FileStatus[],
    [statusFiles, query, scope],
  )
  const orderedPaths = useMemo(() => files.map((file) => file.path), [files])
  const selection = useFileSelection(orderedPaths, repo.repo)
  const fileSelection = useMemo(
    () => ({ checked: selection.checked, onToggle: selection.toggle }),
    [selection.checked, selection.toggle],
  )

  const runBatch = useCallback(
    (work: (paths: string[]) => Promise<unknown>) => {
      const paths = [...selection.checked]
      if (paths.length === 0) return
      selection.clear()
      void work(paths)
    },
    [selection.checked, selection.clear],
  )

  const handleSelectDiff = useCallback(
    (filePath: string, staged: boolean) => repo.selectDiff(filePath, staged),
    [repo.selectDiff],
  )

  const branches = useMemo(
    () =>
      scope === "files" || scope === "commits"
        ? repo.branches
        : repo.branches.filter((branch) => matchesQuery(branch.name, query)),
    [repo.branches, query, scope],
  )
  const tags = useMemo(
    () => (scope === "all" ? repo.tags.filter((tag) => matchesQuery(tag, query)) : repo.tags),
    [repo.tags, query, scope],
  )
  const remotes = useMemo(
    () =>
      scope === "all"
        ? repo.remotes.filter((remote) => [remote.name, remote.url].some((value) => matchesQuery(value, query)))
        : repo.remotes,
    [repo.remotes, query, scope],
  )

  const tabItems: TabItem<SideTab>[] = useMemo(
    () => [
      {
        id: "files",
        icon: <FileDiff size={14} />,
        count: repo.status?.files.length ? repo.status.files.length : undefined,
        title: t(lang, "status"),
      },
      {
        id: "branches",
        icon: <GitBranch size={14} />,
        count: repo.branches.length > 0 ? repo.branches.length : undefined,
        title: t(lang, "branches"),
      },
      {
        id: "tags",
        icon: <TagIcon size={14} />,
        count: repo.tags.length > 0 ? repo.tags.length : undefined,
        title: t(lang, "tags"),
      },
      {
        id: "remotes",
        icon: <Cloud size={14} />,
        count: repo.remotes.length > 0 ? repo.remotes.length : undefined,
        title: t(lang, "remotes"),
      },
      {
        id: "stash",
        icon: <Archive size={14} />,
        count: repo.stashes.length > 0 ? repo.stashes.length : undefined,
        title: t(lang, "stash"),
      },
      {
        id: "submodules",
        icon: <Boxes size={14} />,
        count: repo.submodules.length > 0 ? repo.submodules.length : undefined,
        title: t(lang, "submodules"),
      },
    ],
    [
      lang,
      repo.status?.files.length,
      repo.branches.length,
      repo.tags.length,
      repo.remotes.length,
      repo.stashes.length,
      repo.submodules.length,
    ],
  )

  if (!repo.repo) return <Navigate to="/" replace />

  return (
    <Resizable.Layout
      className={styles.stagingLayout}
      sidebarWidth={{ initial: 300, min: 220, max: 560, storageKey: "staging.side" }}
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
                ariaLabel="Staging sections"
              />
            </div>
            <SearchBox placeholder={t(lang, "searchPh")} />
            {tab === "files" && (
              <SelectionToolbar
                count={selection.checked.size}
                onStage={() => runBatch(repo.stageFiles)}
                onUnstage={() => runBatch(repo.unstageFiles)}
                onDiscard={() => runBatch(repo.discardFiles)}
                onClear={selection.clear}
              />
            )}
          </Flex.Col>
          {tab === "files" && (
            <Status.File
              files={files}
              selectedFilePath={repo.selectedFile}
              detailed
              onSelect={handleSelectDiff}
              selection={fileSelection}
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
              onDeleteBranch={(branchName) => repo.deleteBranch(branchName, false)}
              onRenameBranch={repo.renameBranch}
            />
          )}
          {tab === "tags" && (
            <Tag.Panel
              tags={tags}
              onCreateTag={(tagName, tagMessage) => repo.createTag(tagName, tagMessage)}
              onDeleteTag={repo.deleteTag}
            />
          )}
          {tab === "remotes" && <Branch.Remote remotes={remotes} onAdd={repo.addRemote} onRemove={repo.removeRemote} />}
          {tab === "stash" && (
            <Branch.Stash
              stashMessage={repo.stashMsg}
              onStashMessageChange={repo.setStashMsg}
              onStash={repo.stashPush}
              onPop={repo.stashPopIt}
              stashes={repo.stashes}
              onApply={repo.stashApply}
              onDrop={repo.stashDrop}
              onShowDiff={repo.stashShow}
            />
          )}
          {tab === "submodules" && (
            <Branch.Submodule
              submodules={repo.submodules}
              onUpdate={repo.submoduleUpdate}
              onOpen={(subPath) => repo.handleOpen(`${repo.repo}/${subPath}`)}
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
              onShowUnstaged={() => repo.loadDiff(repo.selectedFile, false)}
              onShowStaged={() => repo.loadDiff(repo.selectedFile, true)}
              onStageFile={() => repo.stageFile(repo.selectedFile)}
              onUnstageFile={() => repo.unstageFile(repo.selectedFile)}
              onDiscardFile={() => repo.discardFile(repo.selectedFile)}
              onEditFile={() => repo.openEditor(repo.selectedFile)}
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
