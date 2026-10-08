import { Pencil, Trash2 } from "lucide-react"

import { List } from "../../List"
import type { CommitPreset } from "@/domain/entities"
import { useTranslation } from "@/presentation/context"

import styles from "./style.module.scss"
import { IconActionButton } from "../../Button"

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
          <IconActionButton icon={<Pencil size={14} />} onClick={() => onEditPreset(preset)} label={t("presetEdit")} />
        )}
        <IconActionButton
          icon={<Trash2 size={14} />}
          tone="danger"
          onClick={() => onDeletePreset(preset.id)}
          label={t("presetDelete")}
        />
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
