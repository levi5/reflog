import { Check, Trash2 } from "lucide-react"

import type { GitProfile } from "@/domain/entities"
import { List } from "../../List"
import { useTranslation } from "@/presentation/context/translation"

import styles from "./style.module.scss"
import { IconActionButton } from "../../Button"

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
        <IconActionButton
          icon={<Check size={18} />}
          size="md"
          onClick={() => onApplyProfile(profile.id)}
          label={t("useProfile")}
        />
        <IconActionButton
          icon={<Trash2 size={18} />}
          size="md"
          tone="danger"
          onClick={() => onRemoveProfile(profile.id)}
          label={t("deleteProfile")}
        />
      </div>
    </>
  )

  return (
    <List.Paged<GitProfile>
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
