import {
  BookOpen,
  Download,
  FileText,
  ListChecks,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings as SettingsIcon,
  Upload,
} from "lucide-react"
import { type ReactNode, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { VIEW_LABELS, VIEW_TABS } from "../../../../shared/constants"
import { useCommitSlice, useRepoCore, useTranslation } from "../../../context"

export interface PaletteEntry {
  id: string
  label: string
  group: string
  icon: ReactNode
  disabled?: boolean
  run: () => void
}

export function usePaletteEntries(): PaletteEntry[] {
  const { t } = useTranslation()
  const repo = useRepoCore()
  const commitSlice = useCommitSlice()
  const navigate = useNavigate()
  const location = useLocation()

  return useMemo(() => {
    const navGroup = t("paletteNav")
    const actionGroup = t("paletteActions")
    const navEntries: PaletteEntry[] = [
      ...VIEW_TABS.map(({ id, icon: Icon }) => ({
        id: `nav-${id}`,
        label: t(VIEW_LABELS[id]),
        group: navGroup,
        icon: <Icon size={15} />,
        run: () => navigate(`/${id}`),
      })),
      {
        id: "nav-docs",
        label: t("docs"),
        group: navGroup,
        icon: <BookOpen size={15} />,
        run: () => navigate("/docs"),
      },
      {
        id: "nav-monitors",
        label: t("monitors"),
        group: navGroup,
        icon: <ListChecks size={15} />,
        run: () => navigate("/monitors"),
      },
      {
        id: "nav-templates",
        label: t("templateTitle"),
        group: navGroup,
        icon: <FileText size={15} />,
        run: () => navigate("/templates"),
      },
      {
        id: "nav-settings",
        label: t("settings"),
        group: navGroup,
        icon: <SettingsIcon size={15} />,
        run: () => navigate("/settings"),
      },
    ]
    const repoUnavailable = !repo.repo || repo.busy
    const actionEntries: PaletteEntry[] = [
      {
        id: "action-stage-all",
        label: t("stageAll"),
        group: actionGroup,
        icon: <Plus size={15} />,
        disabled: repoUnavailable,
        run: () => {
          if (location.pathname !== "/staging") navigate("/staging")
          void commitSlice.stageAll()
        },
      },
      {
        id: "action-fetch",
        label: t("fetch"),
        group: actionGroup,
        icon: <RefreshCw size={15} />,
        disabled: repoUnavailable,
        run: () => void repo.fetchPrune(),
      },
      {
        id: "action-pull",
        label: t("pull"),
        group: actionGroup,
        icon: <Download size={15} />,
        disabled: repoUnavailable,
        run: () => void repo.pullIt(),
      },
      {
        id: "action-push",
        label: t("push"),
        group: actionGroup,
        icon: <Upload size={15} />,
        disabled: repoUnavailable,
        run: () => void repo.pushIt(),
      },
      {
        id: "action-refresh",
        label: t("refresh"),
        group: actionGroup,
        icon: <RotateCcw size={15} />,
        disabled: repoUnavailable,
        run: () => void repo.refresh(repo.repo, "full"),
      },
    ]
    return [...navEntries, ...actionEntries]
  }, [t, repo, commitSlice, navigate, location.pathname])
}
