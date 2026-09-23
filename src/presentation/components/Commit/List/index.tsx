import classnames from "classnames"
import { Edit } from "lucide-react"
import { memo, useMemo } from "react"
import type { GraphRow } from "../../../../domain/entities/graph/commit-graph"
import { layoutCommitGraph as layoutGraph, parseRefs } from "../../../../main/adapters"
import { useTranslation } from "../../../context"
import type { CommitInfo } from "../../../../types"
import { EmptyState } from "../../Empty/State"
import { Icon } from "../../Icons"
import styles from "./style.module.scss"

interface CommitListProps {
  commits: CommitInfo[]
  currentBranchName: string
  showGraph: boolean
  selectedHash?: string
  onSelect?: (commit: CommitInfo) => void
  onAmend?: (commit: CommitInfo) => void
}

function CommitRefBadge({
  refKind,
  refLabel,
  currentBranchName,
}: {
  refKind: string
  refLabel: string
  currentBranchName: string
}) {
  const isCurrentBranch = refKind === "branch" && refLabel === currentBranchName
  return (
    <span title={refLabel} className={classnames(styles.ref, styles[refKind], isCurrentBranch && styles.current)}>
      {refLabel}
    </span>
  )
}

interface CommitItemProps {
  row: GraphRow
  laneCount: number
  showGraph: boolean
  currentBranchName: string
  showAmendButton: boolean
  isSelected: boolean
  onSelect?: (commit: CommitInfo) => void
  onAmend?: (commit: CommitInfo) => void
}

function CommitItem({
  row,
  laneCount,
  showGraph,
  currentBranchName,
  showAmendButton,
  isSelected,
  onSelect,
  onAmend,
}: CommitItemProps) {
  const { t } = useTranslation()
  return (
    <div className={classnames(styles.commit, isSelected && styles.selected)}>
      <button
        type="button"
        className={styles.selectBtn}
        onClick={() => onSelect?.(row.commit)}
        aria-pressed={isSelected}
        aria-label={row.commit.message}
      >
        {showGraph && <Icon.Graph.Cell row={row} lanes={laneCount} className={styles.graph} />}
        <div className={classnames(styles.info, !showGraph && styles.infoNoGraph)}>
          <div className={styles.first}>
            {parseRefs(row.commit.refs).map((ref) => (
              <CommitRefBadge
                key={`${ref.kind}-${ref.label}`}
                refKind={ref.kind}
                refLabel={ref.label}
                currentBranchName={currentBranchName}
              />
            ))}
            <b title={row.commit.message}>{row.commit.message}</b>
          </div>
          <div className={styles.second}>
            <code>{row.commit.short}</code>
            <span>
              {row.commit.author} · {row.commit.date}
            </span>
          </div>
        </div>
      </button>
      {showAmendButton && onAmend && (
        <button
          type="button"
          className={styles.amendBtn}
          onClick={() => onAmend(row.commit)}
          title={t("amendCommit")}
          aria-label={t("amendCommit")}
        >
          <Edit size={14} />
        </button>
      )}
    </div>
  )
}

const MemoCommitItem = memo(CommitItem)

export function CommitList({
  commits,
  currentBranchName,
  showGraph,
  selectedHash,
  onSelect,
  onAmend,
}: CommitListProps) {
  const { t } = useTranslation()
  const commitLayout = useMemo(() => layoutGraph(commits), [commits])

  if (commits.length === 0) {
    return <EmptyState message={t("noChanges")} />
  }

  return (
    <>
      {commitLayout.rows.map((row, rowIndex) => (
        <MemoCommitItem
          key={row.commit.hash}
          row={row}
          laneCount={commitLayout.lanes}
          showGraph={showGraph}
          currentBranchName={currentBranchName}
          showAmendButton={rowIndex === 0}
          isSelected={selectedHash === row.commit.hash}
          onSelect={onSelect}
          onAmend={onAmend}
        />
      ))}
    </>
  )
}
