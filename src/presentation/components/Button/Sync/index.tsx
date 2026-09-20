import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react"
import { useTranslation } from "../../../context"

export interface SyncActionsProps {
  busy: boolean
  behindCount: number
  onFetch: () => void
  onPull: () => void
  onPush: () => void
}

export function SyncActions({ busy, behindCount, onFetch, onPull, onPush }: SyncActionsProps) {
  const { t } = useTranslation()
  return (
    <>
      <button type="button" className="ghost" onClick={onFetch} disabled={busy} title={t("fetch")}>
        <ArrowDownUp size={14} /> {t("fetch")}
      </button>
      <button type="button" className="ghost" onClick={onPull} title={t("pull")}>
        <ArrowDown size={14} /> {t("pull")}
        {behindCount > 0 ? ` ${behindCount}` : ""}
      </button>
      <button type="button" className="push" onClick={onPush} title={t("push")}>
        <ArrowUp size={14} /> {t("push")}
      </button>
    </>
  )
}
