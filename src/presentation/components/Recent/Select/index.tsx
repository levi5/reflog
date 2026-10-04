import { mergeStatsUseCase } from "../../../../data"
import { History, Trash2 } from "lucide-react"
import type { ReactNode } from "react"

import { Select, type SelectOption } from "../../Select"

import { useTranslation } from "../../../context"

type Props = {
  recents: string[]
  value?: string
  disabled?: boolean
  onChange: (value: string) => void
  onClear?: () => void
  icon?: ReactNode
}

export function RecentSelect({
  recents,
  value = "",
  disabled = false,
  onChange,
  onClear,
  icon = <History size={14} />,
}: Props) {
  const { t } = useTranslation()
  const options: SelectOption[] = [
    { value: "", label: t("recents") },
    ...recents.map((path) => ({ value: path, label: mergeStatsUseCase.repoBaseName(path) })),
  ]

  return (
    <>
      <Select
        label={t("recents")}
        value={value}
        options={options}
        disabled={disabled || recents.length === 0}
        icon={icon}
        onChange={onChange}
      />
      {onClear && recents.length > 0 && (
        <button type="button" className="icon-btn" onClick={onClear} title={t("clear")} aria-label={t("clear")}>
          <Trash2 size={14} />
        </button>
      )}
    </>
  )
}
