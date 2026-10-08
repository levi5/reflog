import { GitBranch, ListPlus, RotateCcw, Undo2 } from "lucide-react"
import { useMemo, useState } from "react"
import type { CommitInfo } from "../../../../types"
import { useTranslation } from "../../../context"
import { ActionButton } from "../../Button"
import { Select } from "../../Select"
import { buildResetModeOptions, resetLabelKey, type ResetMode } from "./resetMode"
import styles from "./style.module.scss"

interface DetailActionsProps {
  commit: CommitInfo
  onCherryPick?: (hash: string) => void
  onRevert?: (hash: string) => void
  onReset?: (hash: string, mode: ResetMode) => void
  onCheckout?: (hash: string) => void
}

export function DetailActions({ commit, onCherryPick, onRevert, onReset, onCheckout }: DetailActionsProps) {
  const { t } = useTranslation()
  const [resetMode, setResetMode] = useState<ResetMode>("mixed")
  const resetModeOptions = useMemo(() => buildResetModeOptions(t), [t])
  const isHardReset = resetMode === "hard"

  return (
    <div className={styles.actionsToolbar}>
      {onCherryPick && (
        <ActionButton
          icon={<ListPlus size={12} />}
          onClick={() => onCherryPick(commit.hash)}
          title={t("cherryPickCommit")}
        >
          {t("cherryPick")}
        </ActionButton>
      )}
      {onRevert && (
        <ActionButton icon={<Undo2 size={12} />} onClick={() => onRevert(commit.hash)} title={t("revertCommit")}>
          {t("revertCommit")}
        </ActionButton>
      )}
      {onReset && (
        <>
          <div className={styles.resetMode}>
            <span>{t("resetMode")}</span>
            <Select
              label={t("resetMode")}
              value={resetMode}
              options={resetModeOptions}
              buttonClassName={styles.resetModeSelect}
              onChange={(value) => setResetMode(value as ResetMode)}
            />
          </div>
          <ActionButton
            icon={<RotateCcw size={12} />}
            onClick={() => onReset(commit.hash, resetMode)}
            tone={isHardReset ? "danger" : "default"}
            size="md"
            title={isHardReset ? t("resetHard") : t("resetToCommit")}
            ariaLabel={`${t("resetToCommit")} — ${t(resetLabelKey(resetMode))}`}
          >
            {t("resetToCommit")}
          </ActionButton>
        </>
      )}
      {onCheckout && (
        <ActionButton icon={<GitBranch size={12} />} onClick={() => onCheckout(commit.hash)} title={t("checkout")}>
          {t("checkout")}
        </ActionButton>
      )}
    </div>
  )
}
