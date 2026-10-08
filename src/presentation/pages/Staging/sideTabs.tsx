import { Archive, Boxes, Cloud, FileDiff, FolderTree, GitBranch, Network, Tag as TagIcon } from "lucide-react"
import type { ReactNode } from "react"
import { t } from "../../../i18n"
import type { Lang } from "../../../types"
import type { TabItem } from "../../../types/components"

export type SideTab = "files" | "explorer" | "branches" | "tags" | "remotes" | "stash" | "submodules" | "worktrees"

interface SideTabCounts {
  files: number
  tracked: number
  branches: number
  tags: number
  remotes: number
  stashes: number
  submodules: number
  worktrees: number
}

function countOrUndefined(count: number): number | undefined {
  return count > 0 ? count : undefined
}

const TAB_DEFS: {
  id: SideTab
  titleKey: "status" | "explorer" | "branches" | "tags" | "remotes" | "stash" | "submodules" | "worktrees"
  Icon: typeof FileDiff
}[] = [
  { id: "files", titleKey: "status", Icon: FileDiff },
  { id: "explorer", titleKey: "explorer", Icon: FolderTree },
  { id: "branches", titleKey: "branches", Icon: GitBranch },
  { id: "tags", titleKey: "tags", Icon: TagIcon },
  { id: "remotes", titleKey: "remotes", Icon: Cloud },
  { id: "stash", titleKey: "stash", Icon: Archive },
  { id: "submodules", titleKey: "submodules", Icon: Boxes },
  { id: "worktrees", titleKey: "worktrees", Icon: Network },
]

export function buildSideTabs(lang: Lang, counts: SideTabCounts): TabItem<SideTab>[] {
  const countByTab: Record<SideTab, number> = {
    files: counts.files,
    explorer: counts.tracked,
    branches: counts.branches,
    tags: counts.tags,
    remotes: counts.remotes,
    stash: counts.stashes,
    submodules: counts.submodules,
    worktrees: counts.worktrees,
  }
  return TAB_DEFS.map(({ id, titleKey, Icon }) => ({
    id,
    icon: <Icon size={14} />,
    count: countOrUndefined(countByTab[id]),
    title: t(lang, titleKey),
  }))
}

export type { ReactNode }
