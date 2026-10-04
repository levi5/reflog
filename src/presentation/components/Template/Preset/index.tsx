import { Pencil, Trash2 } from "lucide-react"
import classnames from "classnames"

import { List } from "../../List"
import type { CommitPreset } from "@/domain/entities"
import { useTranslation } from "@/presentation/context"

import styles from "./style.module.scss"

const PRESETS_PER_PAGE = 100

interface PresetListProps {
  presets: CommitPreset[]
  lang?: string
  onDeletePreset: (id: string) => void
  onEditPreset?: (preset: CommitPreset) => void
}

export function PresetList({ presets, onDeletePreset, onEditPreset }: PresetListProps) {
  const { t } = useTranslation()
  const emptyState = (
    <div className={styles.emptyPresets}>
      <p>{t("presetsEmpty")}</p>
      <small>{t("noPresetsHint")}</small>
    </div>
  )

  const renderItem = (preset: CommitPreset) => (
    <>
      <div className={styles.itemContent}>
        <div className={styles.presetInfo}>
          <span className={styles.presetTypeTag}>{preset.type}</span>
          <div>
            <div className={styles.presetName}>{preset.name}</div>
            {preset.scope && <span className={styles.presetScope}>({preset.scope})</span>}
          </div>
        </div>
      </div>
      <div className={styles.itemActions}>
        {onEditPreset && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onEditPreset(preset)}
            aria-label={t("presetEdit")}
            title={t("presetEdit")}
          >
            <Pencil size={14} />
          </button>
        )}
        <button
          type="button"
          className={classnames(styles.actionBtn, styles.danger)}
          onClick={() => onDeletePreset(preset.id)}
          aria-label={t("presetDelete")}
          title={t("presetDelete")}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </>
  )

  return (
    <List.Paged<CommitPreset>
      items={presets}
      selectedId={null}
      currentPage={0}
      pageSize={PRESETS_PER_PAGE}
      onPageChange={() => {}}
      getItemId={(preset) => preset.id}
      renderItem={renderItem}
      emptyState={emptyState}
      itemClassName={styles.listItem}
      listClassName={styles.virtualListWrapper}
    />
  )
}
