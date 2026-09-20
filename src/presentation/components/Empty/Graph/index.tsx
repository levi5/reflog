import classNames from "classnames"
import { useTranslation } from "../../../context"
import { EmptyState } from "../State"

type EmptyGraphStateProps = {
  className?: string
}

export const EmptyGraphState = ({ className }: EmptyGraphStateProps) => {
  const { t } = useTranslation()
  return (
    <div className={className}>
      <main className={classNames("canvasWrap")}>
        <EmptyState message={t("noChanges")} />
      </main>
    </div>
  )
}
