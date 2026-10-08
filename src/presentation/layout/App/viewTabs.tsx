import { VIEW_LABELS, VIEW_TABS } from "../../../shared/constants"
import { t } from "../../../i18n"
import type { Lang } from "../../../types"
import type { TabItem } from "../../../types/components"
import type { View } from "../../hooks/repository/useRepoCore"

interface ViewTabCounts {
  remainingHunks: number
  changedFiles: number
}

export function buildViewTabs(lang: Lang, counts: ViewTabCounts): TabItem<View>[] {
  return VIEW_TABS.map(({ id, icon: Icon }) => {
    const count = id === "merge" ? counts.remainingHunks : id === "staging" ? counts.changedFiles : 0
    return {
      id,
      label: t(lang, VIEW_LABELS[id]),
      icon: <Icon size={13} />,
      count: count > 0 ? count : undefined,
      alert: id === "merge" && counts.remainingHunks > 0,
      title: id === "merge" ? t(lang, "conflictsDetected") : id === "staging" ? t(lang, "stagingDiff") : undefined,
    }
  })
}
