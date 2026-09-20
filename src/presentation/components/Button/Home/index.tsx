import classnames from "classnames"
import { Home } from "lucide-react"
import { useTranslation } from "../../../context"

export interface HomeButtonProps {
  isActive: boolean
  onNavigateHome: () => void
}

export function HomeButton({ isActive, onNavigateHome }: HomeButtonProps) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      className={classnames("icon-btn", isActive && "active")}
      onClick={onNavigateHome}
      title={t("welcome")}
      aria-label={t("welcome")}
    >
      <Home size={14} />
    </button>
  )
}
