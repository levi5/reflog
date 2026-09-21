import { Bot, FileDiff, GitBranch, GitMerge, List, Workflow } from "lucide-react"
import type { StringKey } from "../../i18n"
import type { View } from "../../presentation/hooks"

export const VIEW_TABS: { id: View; icon: typeof List }[] = [
  { id: "graph", icon: GitBranch },
  { id: "staging", icon: FileDiff },
  { id: "merge", icon: GitMerge },
  { id: "blame", icon: List },
  { id: "visualize", icon: Workflow },
  { id: "automation", icon: Bot },
]

export const VIEW_LABELS: Record<View, StringKey> = {
  graph: "logGraph",
  staging: "stagingDiff",
  merge: "mergeConflictsTab",
  blame: "treeBlame",
  visualize: "visualize",
  automation: "automations",
  monitors: "monitors",
  templates: "templateTitle",
  settings: "settings",
  docs: "docs",
}
