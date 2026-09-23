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

  const renderItem = (profile: GitProfile) => (
    <>
      <button type="button" className={styles.itemContent} onClick={() => onApplyProfile(profile.id)}>
        <code>
          {profile.emoji ? `${profile.emoji} ` : ""}
          {profile.name}
        </code>
        <span>{profile.email}</span>
        {activeProfileId === profile.id && <span className={styles.activeBadge}>{t("active")}</span>}
      </button>
      <div className={styles.itemActions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => onApplyProfile(profile.id)}
          title={t("useProfile")}
          aria-label={t("useProfile")}
        >
          <Check size={18} />
        </button>
        <button
          type="button"
          className={classnames(styles.actionBtn, styles.danger)}
          onClick={() => onRemoveProfile(profile.id)}
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
      getItemId={(profile) => profile.id}
      renderItem={renderItem}
      emptyState={emptyState}
      itemClassName={styles.listItem}
      listClassName={styles.virtualListWrapper}
    />
  )
}
