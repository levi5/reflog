import { Play, Plus, Trash2, Zap } from "lucide-react"

import { List } from "@/presentation/components/List"

import type { MonitorAutomation } from "@/domain/entities"
import { useTranslation } from "@/presentation/context"

import styles from "./style.module.scss"
import { IconActionButton } from "../../Button"

const MONITORS_PER_PAGE = 10

interface MonitorsListProps {
  monitors: MonitorAutomation[]
  selectedId: string | null
  onSelectMonitor: (monitor: MonitorAutomation) => void
  onCreateMonitor: () => void
  onCreateExampleMonitor: () => void
  onRunMonitor: (monitor: MonitorAutomation) => void
  onDeleteMonitor: (id: string) => void
  isRunning: boolean
  currentPage: number
  onPageChange: (page: number) => void
}

export function MonitorsList({
  monitors,
  selectedId,
  onSelectMonitor,
  onCreateMonitor,
  onCreateExampleMonitor,
  onRunMonitor,
  onDeleteMonitor,
  isRunning,
  currentPage,
  onPageChange,
}: MonitorsListProps) {
  const { t } = useTranslation()

  const header = (
    <div className={styles.listHead}>
      <strong>{t("monitors")}</strong>
      <div className={styles.listActions}>
        <button type="button" className="mini-btn" title={t("localExample")} onClick={onCreateExampleMonitor}>
          <Zap size={12} />
        </button>
        <button type="button" className="mini-btn" onClick={onCreateMonitor}>
          <Plus size={12} /> {t("newMonitor")}
        </button>
      </div>
    </div>
  )

  const emptyState = (
    <div className={styles.emptyList}>
      <p>{t("noMonitors")}</p>
    </div>
  )

  const renderItem = (monitor: MonitorAutomation, _isSelected: boolean) => (
    <>
      <button type="button" className={styles.itemContent} onClick={() => onSelectMonitor(monitor)}>
        <span className={styles.monitorColor} style={{ background: monitor.color }} />
        <span className={styles.itemText}>
          <strong>{monitor.name || t("unnamed")}</strong>
          <small>
            {monitor.blocks.length} {t("steps").toLowerCase()}
          </small>
        </span>
      </button>
      <div className={styles.itemActions}>
        <IconActionButton
          icon={<Play size={15} />}
          tone="success"
          disabled={isRunning || monitor.blocks.length === 0}
          onClick={() => onRunMonitor(monitor)}
          label={t("saveAndRun")}
        />
        <IconActionButton icon={<Trash2 size={15} />} onClick={() => onDeleteMonitor(monitor.id)} label={t("delete")} />
      </div>
    </>
  )

  return (
    <List.Paged<MonitorAutomation>
      items={monitors}
      selectedId={selectedId}
      currentPage={currentPage}
      pageSize={MONITORS_PER_PAGE}
      onPageChange={onPageChange}
      getItemId={(monitor) => monitor.id}
      renderItem={renderItem}
      emptyState={emptyState}
      header={header}
      listClassName={styles.virtualListWrapper}
    />
  )
}
