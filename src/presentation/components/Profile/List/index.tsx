import { Check, Trash2 } from "lucide-react"
import classnames from "classnames"

import type { GitProfile } from "@/domain/entities"
import { List } from "../../List"
import { useTranslation } from "@/presentation/context/translation"

import styles from "./style.module.scss"

const PROFILES_PER_PAGE = 100

interface ProfileListProps {
  profiles: GitProfile[]
  activeProfileId: string
  onApplyProfile: (profileId: string) => void
  onRemoveProfile: (profileId: string) => void
}

export function ProfileList({ profiles, activeProfileId, onApplyProfile, onRemoveProfile }: ProfileListProps) {
  const { t } = useTranslation()

  const emptyState = <p className={styles.emptyText}>{t("noProfiles")}</p>

  const renderItem = (
    profile: GitProfile,
    _isSelected: boolean,
    _actions: Array<{ onClick: () => void; icon?: React.ReactNode; ariaLabel?: string }>,
  ) => (
    <>
      <div className={styles.itemContent}>
        <code>
          {profile.emoji ? `${profile.emoji} ` : ""}
          {profile.name}
        </code>
        <span>{profile.email}</span>
        {activeProfileId === profile.id && <span className={styles.activeBadge}>{t("active")}</span>}
      </div>
      <div className={styles.itemActions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={(e) => {
            e.stopPropagation()
            onApplyProfile(profile.id)
          }}
          title={t("useProfile")}
          aria-label={t("useProfile")}
        >
          <Check size={18} />
        </button>
        <button
          type="button"
          className={classnames(styles.actionBtn, styles.danger)}
          onClick={(e) => {
            e.stopPropagation()
            onRemoveProfile(profile.id)
          }}
          title={t("deleteProfile")}
          aria-label={t("deleteProfile")}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </>
  )

  return (
    <List.Virtual<GitProfile>
      items={profiles}
      selectedId={activeProfileId}
      currentPage={0}
      pageSize={PROFILES_PER_PAGE}
      onPageChange={() => {}}
      onSelect={(id) => onApplyProfile(id)}
      onAction={(id: string, action: string) => {
        if (action === "run") {
          onApplyProfile(id)
        } else if (action === "delete") {
          onRemoveProfile(id)
        }
      }}
      isRunning={false}
      getItemId={(profile) => profile.id}
      renderItem={renderItem}
      emptyState={emptyState}
      itemClassName={styles.listItem}
      listClassName={styles.virtualListWrapper}
    />
  )
}
