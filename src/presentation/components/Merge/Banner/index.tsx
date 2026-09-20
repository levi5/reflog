import classnames from "classnames"
import { ArrowRight, CircleCheck, ListOrdered, OctagonX, SquareTerminal, TriangleAlert } from "lucide-react"
import type { BranchInfo } from "../../../../types"
import { useTranslation } from "../../../context"
import { Select } from "../../Select"
import { Switch } from "../../Switch"
import styles from "./style.module.scss"

interface MergeBannerProps {
  isMerging: boolean
  currentBranchName: string
  sourceBranchName: string
  totalHunks: number
  resolvedHunks: number
  remainingHunks: number
  rebaseCount: number
  branches: BranchInfo[]
  mergeInput: string
  onMergeInputChange: (branchName: string) => void
  squashMerge: boolean
  noFastForward: boolean
  onSquashChange: (squash: boolean) => void
  onNoFastForwardChange: (noFastForward: boolean) => void
  onStartMerge: () => void
  onAbortMerge: () => void
  onContinueMerge: () => void
  onOpenTerminal: () => void
  onToggleRebase: () => void
}

function MergeStatusIcon({ isMerging }: { isMerging: boolean }) {
  return (
    <span className={isMerging ? styles.alertIco : styles.okIco}>
      {isMerging ? <TriangleAlert size={16} /> : <CircleCheck size={16} />}
    </span>
  )
}

interface MergeTitleProps {
  isMerging: boolean
  currentBranchName: string
  sourceBranchName: string
}

function MergeTitle({ isMerging, currentBranchName, sourceBranchName }: MergeTitleProps) {
  const { t } = useTranslation()
  if (!isMerging) {
    return (
      <div className={styles.mbTitle}>
        <strong>{t("noMerge")}</strong>
        <span className={styles.sep}>·</span>
        <span className={styles.mergingWord}>{t("noMergeHint")}</span>
      </div>
    )
  }

  return (
    <div className={styles.mbTitle}>
      <strong>{t("mergeInProgress")}</strong>
      <span className={styles.sep}>·</span>
      <span className={styles.mergingWord}>
        {t("mergingInto")} <span className={styles.branchPillSrc}>{sourceBranchName || "…"}</span> {t("intoWord")}{" "}
        <span className={styles.branchPillDst}>{currentBranchName}</span>
      </span>
    </div>
  )
}

interface MergeCountsProps {
  totalHunks: number
  resolvedHunks: number
  remainingHunks: number
}

function MergeCounts({ totalHunks, resolvedHunks, remainingHunks }: MergeCountsProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.mbCounts}>
      <span className={styles.cErr}>
        {totalHunks} {t("conflictsDetected")}
      </span>
      <span>•</span>
      <span className={styles.cOk}>
        {resolvedHunks} {t("resolvedWord")}
      </span>
      <span>•</span>
      <span className={styles.cWarn}>
        {remainingHunks} {t("remainingWord")}
      </span>
    </div>
  )
}

interface MergingActionsProps {
  remainingHunks: number
  onOpenTerminal: () => void
  onAbortMerge: () => void
  onContinueMerge: () => void
}

function MergingActions({ remainingHunks, onOpenTerminal, onAbortMerge, onContinueMerge }: MergingActionsProps) {
  const { t } = useTranslation()
  return (
    <>
      <button type="button" className={classnames("ghost", styles.dark)} onClick={onOpenTerminal}>
        <SquareTerminal size={14} /> {t("openTerminal")}
      </button>
      <button type="button" className="danger" onClick={onAbortMerge}>
        <OctagonX size={14} /> {t("abortMerge")}
      </button>
      <button
        type="button"
        className={classnames("ghost", styles.dark)}
        disabled={remainingHunks > 0}
        onClick={onContinueMerge}
      >
        <ArrowRight size={14} /> {t("continueMerge")}
      </button>
    </>
  )
}

interface IdleMergeActionsProps {
  branches: BranchInfo[]
  currentBranchName: string
  mergeInput: string
  squashMerge: boolean
  noFastForward: boolean
  onMergeInputChange: (branchName: string) => void
  onSquashChange: (squash: boolean) => void
  onNoFastForwardChange: (noFastForward: boolean) => void
  onStartMerge: () => void
}

function IdleMergeActions({
  branches,
  currentBranchName,
  mergeInput,
  squashMerge,
  noFastForward,
  onMergeInputChange,
  onSquashChange,
  onNoFastForwardChange,
  onStartMerge,
}: IdleMergeActionsProps) {
  const { t } = useTranslation()
  const mergeOptions = [
    { value: "", label: t("merge") },
    ...branches
      .filter((branch) => branch.name !== currentBranchName)
      .map((branch) => ({ value: branch.name, label: branch.name })),
  ]

  return (
    <>
      <Select
        label={t("merge")}
        value={mergeInput}
        options={mergeOptions}
        disabled={mergeOptions.length <= 1}
        onChange={onMergeInputChange}
      />
      <Switch size="sm" checked={squashMerge} onChange={onSquashChange} label={t("squash")} title={t("squashHint")} />
      <Switch
        size="sm"
        checked={noFastForward}
        disabled={squashMerge}
        onChange={onNoFastForwardChange}
        label={t("noff")}
      />
      <button type="button" className="primary" disabled={!mergeInput.trim()} onClick={onStartMerge}>
        {t("startMerge")}
      </button>
    </>
  )
}

function RebaseToggle({ rebaseCount, onToggleRebase }: { rebaseCount: number; onToggleRebase: () => void }) {
  const { t } = useTranslation()
  return (
    <button type="button" className={styles.rebaseBtn} onClick={onToggleRebase}>
      <ListOrdered size={14} /> {t("interactiveRebase")}
      {rebaseCount > 0 && <span className={styles.rebaseCount}>{rebaseCount}</span>}
    </button>
  )
}

export function MergeBanner({
  isMerging,
  currentBranchName,
  sourceBranchName,
  totalHunks,
  resolvedHunks,
  remainingHunks,
  rebaseCount,
  branches,
  mergeInput,
  onMergeInputChange,
  squashMerge,
  noFastForward,
  onSquashChange,
  onNoFastForwardChange,
  onStartMerge,
  onAbortMerge,
  onContinueMerge,
  onOpenTerminal,
  onToggleRebase,
}: MergeBannerProps) {
  return (
    <div className={classnames(styles.banner, !isMerging && styles.idle)}>
      <MergeStatusIcon isMerging={isMerging} />
      <div className={styles.mbText}>
        <MergeTitle isMerging={isMerging} currentBranchName={currentBranchName} sourceBranchName={sourceBranchName} />
        {isMerging && (
          <MergeCounts totalHunks={totalHunks} resolvedHunks={resolvedHunks} remainingHunks={remainingHunks} />
        )}
      </div>
      <div className="spacer" />
      {isMerging ? (
        <MergingActions
          remainingHunks={remainingHunks}
          onOpenTerminal={onOpenTerminal}
          onAbortMerge={onAbortMerge}
          onContinueMerge={onContinueMerge}
        />
      ) : (
        <IdleMergeActions
          branches={branches}
          currentBranchName={currentBranchName}
          mergeInput={mergeInput}
          squashMerge={squashMerge}
          noFastForward={noFastForward}
          onMergeInputChange={onMergeInputChange}
          onSquashChange={onSquashChange}
          onNoFastForwardChange={onNoFastForwardChange}
          onStartMerge={onStartMerge}
        />
      )}
      <div className={styles.mbDivider} />
      <RebaseToggle rebaseCount={rebaseCount} onToggleRebase={onToggleRebase} />
    </div>
  )
}
