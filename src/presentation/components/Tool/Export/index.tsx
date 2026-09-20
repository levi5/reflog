import { Download } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"
import { useTranslation } from "../../../context"

export interface ExportToolProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  onExport: () => void
  label?: string
}

export function ExportTool({ onExport, label, className, disabled, ...rest }: ExportToolProps) {
  const { t } = useTranslation()
  const buttonLabel = label ?? t("exportRecipes")

  return (
    <button
      type="button"
      className={className ?? "mini-btn"}
      onClick={onExport}
      disabled={disabled}
      title={buttonLabel}
      aria-label={buttonLabel}
      {...rest}
    >
      <Download size={12} />
      <span>{buttonLabel}</span>
    </button>
  )
}
